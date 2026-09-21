#include "HardwareIO.h"

#include <algorithm>

namespace {
constexpr bool RELAY_ENERGIZED_LEVEL = HIGH;
constexpr bool INPUT_ACTIVE_LEVEL = LOW;
float clampf(float value, float low, float high) { return std::max(low, std::min(value, high)); }
}

void HardwareIO::begin() {
  analogReadResolution(12);
  for (uint8_t pin : {BoardPins::GRID_OK, BoardPins::E_STOP, BoardPins::BMS_FAULT,
                      BoardPins::INVERTER_FAULT, BoardPins::LEAK}) pinMode(pin, INPUT_PULLUP);
  for (uint8_t pin : {BoardPins::PV_CONTACTOR, BoardPins::WIND_CONTACTOR, BoardPins::WIND_BRAKE,
                      BoardPins::BATTERY_CONTACTOR, BoardPins::GRID_CONTACTOR, BoardPins::FIRST_FLUSH_VALVE,
                      BoardPins::STORAGE_VALVE, BoardPins::OVERFLOW_VALVE, BoardPins::CLEANING_PUMP,
                      BoardPins::FILTRATION_PUMP, BoardPins::LOAD_SHED}) {
    pinMode(pin, OUTPUT);
  }
  forceSafe();
}

float HardwareIO::readScaled(uint8_t pin, const AnalogScale& scale) const {
  const float mv = analogReadMilliVolts(pin);
  const float span = std::max(1.0f, scale.fullScaleMv - scale.zeroMv);
  const float normalized = clampf((mv - scale.zeroMv) / span, 0, 1);
  return scale.engineeringMin + normalized * (scale.engineeringMax - scale.engineeringMin);
}

SensorSnapshot HardwareIO::sample(uint32_t nowMs) {
  SensorSnapshot s;
  s.sampledAtMs = nowMs;
  s.pvPowerKw = readScaled(BoardPins::PV_POWER, Calibration::PV_KW);
  s.windPowerKw = readScaled(BoardPins::WIND_POWER, Calibration::WIND_KW);
  s.loadPowerKw = readScaled(BoardPins::LOAD_POWER, Calibration::LOAD_KW);
  s.batteryVoltageV = readScaled(BoardPins::BATTERY_VOLTAGE, Calibration::BATTERY_V);
  s.batteryCurrentA = readScaled(BoardPins::BATTERY_CURRENT, Calibration::BATTERY_A);
  s.batteryTempC = readScaled(BoardPins::BATTERY_TEMP, Calibration::TEMP_C);
  s.tankLevelPct = readScaled(BoardPins::TANK_LEVEL, Calibration::TANK_PCT);
  s.waterTurbidityNtu = readScaled(BoardPins::TURBIDITY, Calibration::TURBIDITY_NTU);
  s.solarIrradianceWm2 = readScaled(BoardPins::IRRADIANCE, Calibration::IRRADIANCE);
  s.windSpeedMs = readScaled(BoardPins::WIND_SPEED, Calibration::WIND_MS);
  s.rainfallMmHr = readScaled(BoardPins::RAIN_RATE, Calibration::RAIN_MM_HR);
  s.panelTempC = readScaled(BoardPins::PANEL_TEMP, Calibration::TEMP_C);
  s.ambientTempC = readScaled(BoardPins::AMBIENT_TEMP, Calibration::TEMP_C);
  s.gridAvailable = digitalRead(BoardPins::GRID_OK) == INPUT_ACTIVE_LEVEL;
  // Safety loops are normally closed to ground. Broken/unwired conductors read HIGH and fault safe.
  s.emergencyStop = digitalRead(BoardPins::E_STOP) != INPUT_ACTIVE_LEVEL;
  s.bmsFault = digitalRead(BoardPins::BMS_FAULT) != INPUT_ACTIVE_LEVEL;
  s.inverterFault = digitalRead(BoardPins::INVERTER_FAULT) != INPUT_ACTIVE_LEVEL;
  s.leakDetected = digitalRead(BoardPins::LEAK) != INPUT_ACTIVE_LEVEL;

  // Reference 24 Ah coulomb counter, initialized from open-circuit voltage.
  // Positive current means charging; replace with native BMS SOC when available.
  if (batterySoc_ < 0) batterySoc_ = clampf((s.batteryVoltageV - 20.0f) / 8.4f * 100.0f, 0, 100);
  if (lastSampleMs_ != 0) {
    const float hours = (nowMs - lastSampleMs_) / 3600000.0f;
    batterySoc_ = clampf(batterySoc_ + (s.batteryCurrentA * hours / 24.0f) * 100.0f, 0, 100);
  }
  lastSampleMs_ = nowMs;
  s.batterySoc = batterySoc_;
  s.humidityPct = 0;  // Optional external environmental sensor.
  const float expectedPv = std::max(0.05f, s.solarIrradianceWm2 / 1000.0f * 3.0f);
  s.soilingIndex = clampf(1.0f - s.pvPowerKw / expectedPv, 0, 0.35f);

  const bool transducersPresent = analogReadMilliVolts(BoardPins::PV_POWER) > 300 &&
                                  analogReadMilliVolts(BoardPins::BATTERY_VOLTAGE) > 300 &&
                                  analogReadMilliVolts(BoardPins::TANK_LEVEL) > 300;
  const bool analogPlausible = transducersPresent && s.batteryVoltageV >= 18 && s.batteryVoltageV <= 31 &&
                               s.tankLevelPct >= 0 && s.tankLevelPct <= 100 &&
                               s.panelTempC > -20 && s.panelTempC < 100;
  s.sensorValid = analogPlausible;
  lastPvKw_ = s.pvPowerKw;
  lastSoiling_ = s.soilingIndex;
  return s;
}

void HardwareIO::writeSafe(uint8_t pin, bool energized) {
  digitalWrite(pin, energized ? RELAY_ENERGIZED_LEVEL : !RELAY_ENERGIZED_LEVEL);
}

void HardwareIO::apply(const ActuatorCommand& o) {
  writeSafe(BoardPins::PV_CONTACTOR, o.pvContactor);
  writeSafe(BoardPins::WIND_CONTACTOR, o.windContactor);
  writeSafe(BoardPins::WIND_BRAKE, o.windBrake);
  writeSafe(BoardPins::BATTERY_CONTACTOR, o.batteryContactor);
  writeSafe(BoardPins::GRID_CONTACTOR, o.gridContactor);
  writeSafe(BoardPins::FIRST_FLUSH_VALVE, o.firstFlushValve);
  writeSafe(BoardPins::STORAGE_VALVE, o.storageValve);
  writeSafe(BoardPins::OVERFLOW_VALVE, o.overflowValve);
  writeSafe(BoardPins::CLEANING_PUMP, o.cleaningPump);
  writeSafe(BoardPins::FILTRATION_PUMP, o.filtrationPump);
  writeSafe(BoardPins::LOAD_SHED, o.loadShedRelay);
}

void HardwareIO::forceSafe() {
  ActuatorCommand safe;
  safe.windBrake = true;
  safe.loadShedRelay = true;
  apply(safe);
}
