#include "ControlEngine.h"

#include <algorithm>

namespace {
bool elapsed(uint32_t now, uint32_t deadline) { return static_cast<int32_t>(now - deadline) >= 0; }
}

const char* modeName(OperatingMode mode) {
  switch (mode) {
    case OperatingMode::STARTUP: return "STARTUP";
    case OperatingMode::NORMAL: return "NORMAL";
    case OperatingMode::CONSERVE: return "CONSERVE";
    case OperatingMode::STORM: return "STORM";
    case OperatingMode::CLEANING: return "CLEANING";
    case OperatingMode::MANUAL: return "MANUAL";
    case OperatingMode::FAULT: return "FAULT";
  }
  return "FAULT";
}

OperatingMode parseMode(const String& value) {
  if (value == "NORMAL") return OperatingMode::NORMAL;
  if (value == "CONSERVE") return OperatingMode::CONSERVE;
  if (value == "STORM") return OperatingMode::STORM;
  if (value == "CLEANING") return OperatingMode::CLEANING;
  return OperatingMode::MANUAL;
}

ControlEngine::ControlEngine(const ControllerConfig& config) : config_(config) {}

void ControlEngine::reset(uint32_t nowMs) {
  bootMs_ = nowMs;
  lastTickMs_ = nowMs;
  cleaningEndsMs_ = 0;
  rainEventMm_ = 0;
  previousMode_ = OperatingMode::STARTUP;
}

AlarmFlags ControlEngine::alarmsFor(const SensorSnapshot& s, uint32_t nowMs) const {
  AlarmFlags alarms;
  auto add = [&](AlarmBit bit, bool critical) {
    alarms.mask |= static_cast<uint32_t>(bit);
    alarms.critical = alarms.critical || critical;
  };
  if (!s.sensorValid || nowMs - s.sampledAtMs > config_.sensorTimeoutMs) add(ALARM_SENSOR, true);
  if (s.emergencyStop) add(ALARM_ESTOP, true);
  if (s.bmsFault) add(ALARM_BMS, true);
  if (s.inverterFault) add(ALARM_INVERTER, true);
  if (s.leakDetected) add(ALARM_LEAK, true);
  if (s.batteryTempC >= config_.batteryCriticalTempC) add(ALARM_BATTERY_TEMP, true);
  else if (s.batteryTempC >= config_.batteryHighTempC) add(ALARM_BATTERY_TEMP, false);
  if (s.batterySoc <= config_.batteryCriticalSoc) add(ALARM_BATTERY_LOW, false);
  if (s.tankLevelPct >= config_.tankHighPct) add(ALARM_TANK_HIGH, false);
  if (s.waterTurbidityNtu > 5) add(ALARM_WATER_QUALITY, false);
  if (!s.gridAvailable) add(ALARM_GRID, false);
  return alarms;
}

bool ControlEngine::cleaningEligible(const SensorSnapshot& s) const {
  return s.soilingIndex >= config_.cleaningSoilingThreshold &&
         s.tankLevelPct >= config_.tankCleaningReservePct &&
         s.windSpeedMs < config_.cleaningMaxWindMs &&
         s.rainfallMmHr < config_.rainCaptureStartMmHr &&
         s.solarIrradianceWm2 <= config_.cleaningMaxIrradianceWm2 &&
         s.panelTempC <= config_.cleaningMaxPanelTempC &&
         !s.leakDetected && s.waterTurbidityNtu <= 5;
}

ActuatorCommand ControlEngine::failSafe(const SensorSnapshot& s) const {
  (void)s;
  ActuatorCommand out;
  out.windBrake = true;
  out.loadShedRelay = true;
  return out;
}

ControlResult ControlEngine::evaluate(const SensorSnapshot& s, const ControlRequest& request, uint32_t nowMs) {
  ControlResult result;
  result.alarms = alarmsFor(s, nowMs);
  result.cleaningEligible = cleaningEligible(s);
  const float hours = lastTickMs_ == 0 ? 0 : (nowMs - lastTickMs_) / 3600000.0f;
  lastTickMs_ = nowMs;
  const bool startup = nowMs - bootMs_ < config_.startupValidationMs;
  const bool storm = s.windSpeedMs >= config_.windStormMs || s.rainfallMmHr >= config_.rainStormMmHr;
  const bool commandValid = request.manualEnabled && !elapsed(nowMs, request.validUntilMs);
  const bool requestedCleaning = commandValid && request.requestedMode == OperatingMode::CLEANING;
  const bool automaticCleaning = s.soilingIndex >= config_.cleaningAutoThreshold;
  const bool activeCleaning = cleaningEndsMs_ != 0 && !elapsed(nowMs, cleaningEndsMs_);

  if (!result.cleaningEligible) cleaningEndsMs_ = 0;
  if (result.alarms.critical) result.mode = OperatingMode::FAULT;
  else if (startup) result.mode = OperatingMode::STARTUP;
  else if (storm) result.mode = OperatingMode::STORM;
  else if ((activeCleaning || requestedCleaning || automaticCleaning) && result.cleaningEligible) result.mode = OperatingMode::CLEANING;
  else if (!s.gridAvailable || s.batterySoc <= config_.batteryMinSoc + 5) result.mode = OperatingMode::CONSERVE;
  else if (commandValid && request.requestedMode != OperatingMode::CLEANING) result.mode = request.requestedMode;
  else result.mode = OperatingMode::NORMAL;

  if (result.mode == OperatingMode::FAULT || result.mode == OperatingMode::STARTUP) {
    result.outputs = failSafe(s);
    result.power.demandKw = s.loadPowerKw;
    result.power.loadShedKw = s.loadPowerKw;
    result.decision = result.mode == OperatingMode::FAULT ? "Safety isolation active" : "Validating sensors and interlocks";
    previousMode_ = result.mode;
    return result;
  }

  if (result.mode == OperatingMode::CLEANING && cleaningEndsMs_ == 0) cleaningEndsMs_ = nowMs + config_.cleaningDurationMs;
  if (result.mode != OperatingMode::CLEANING) cleaningEndsMs_ = 0;
  result.cleaningRemainingMs = cleaningEndsMs_ == 0 ? 0 : cleaningEndsMs_ - nowMs;

  const bool windSafe = s.windSpeedMs >= config_.windCutInMs && s.windSpeedMs < config_.windCutOutMs;
  result.outputs.pvContactor = true;
  result.outputs.windContactor = windSafe;
  result.outputs.windBrake = !windSafe;
  result.outputs.batteryContactor = !s.bmsFault;
  result.outputs.gridContactor = s.gridAvailable;
  result.outputs.cleaningPump = result.mode == OperatingMode::CLEANING;

  result.power.renewableKw = std::max(0.0f, s.pvPowerKw) + (windSafe ? std::max(0.0f, s.windPowerKw) : 0);
  result.power.demandKw = std::max(0.0f, s.loadPowerKw) + (result.outputs.cleaningPump ? 0.12f : 0);
  result.power.reserveSoc = (result.mode == OperatingMode::STORM || !s.gridAvailable) ? config_.batteryStormReserveSoc : config_.batteryMinSoc;
  const float net = result.power.renewableKw - result.power.demandKw;
  if (net >= 0) {
    result.power.batteryChargeKw = s.batterySoc < config_.batteryMaxSoc ? std::min(net, config_.batteryMaxChargeKw) : 0;
    const float remaining = std::max(0.0f, net - result.power.batteryChargeKw);
    if (s.gridAvailable) result.power.gridExportKw = remaining; else result.power.curtailedKw = remaining;
  } else {
    const float deficit = -net;
    result.power.batteryDischargeKw = s.batterySoc > result.power.reserveSoc ? std::min(deficit, config_.batteryMaxDischargeKw) : 0;
    const float remaining = std::max(0.0f, deficit - result.power.batteryDischargeKw);
    if (s.gridAvailable) result.power.gridImportKw = remaining; else result.power.loadShedKw = remaining;
  }
  result.outputs.loadShedRelay = result.power.loadShedKw > 0.01f;

  const bool raining = s.rainfallMmHr >= config_.rainCaptureStartMmHr;
  rainEventMm_ = raining ? rainEventMm_ + s.rainfallMmHr * hours : 0;
  result.water.rainEventMm = rainEventMm_;
  result.water.firstFlushActive = raining && rainEventMm_ < config_.firstFlushMm;
  result.water.storageActive = raining && !result.water.firstFlushActive && s.waterTurbidityNtu <= 5 && s.tankLevelPct < config_.tankHighPct;
  result.water.overflowActive = raining && !result.water.firstFlushActive && !result.water.storageActive;
  result.water.captureRateLpm = result.water.storageActive ? s.rainfallMmHr * 1.8f : 0;
  result.outputs.firstFlushValve = result.water.firstFlushActive;
  result.outputs.storageValve = result.water.storageActive;
  result.outputs.overflowValve = result.water.overflowActive;
  result.outputs.filtrationPump = result.water.storageActive;

  if (result.mode == OperatingMode::CLEANING) result.decision = "Safe cleaning cycle active";
  else if (result.mode == OperatingMode::STORM) result.decision = "Storm reserve and rain capture active";
  else if (result.mode == OperatingMode::CONSERVE) result.decision = "Battery reserve protection active";
  else if (result.power.batteryChargeKw > 0) result.decision = "Renewables serving load and charging battery";
  else if (result.power.batteryDischargeKw > 0) result.decision = "Battery supporting active load";
  else result.decision = "Renewable routing stable";
  previousMode_ = result.mode;
  return result;
}
