#pragma once

#include <Arduino.h>

enum class OperatingMode : uint8_t {
  STARTUP,
  NORMAL,
  CONSERVE,
  STORM,
  CLEANING,
  MANUAL,
  FAULT
};

struct SensorSnapshot {
  uint32_t sampledAtMs = 0;
  float pvPowerKw = 0;
  float windPowerKw = 0;
  float loadPowerKw = 0;
  float batterySoc = 0;
  float batteryVoltageV = 0;
  float batteryCurrentA = 0;
  float batteryTempC = 0;
  float tankLevelPct = 0;
  float rainfallMmHr = 0;
  float waterTurbidityNtu = 0;
  float solarIrradianceWm2 = 0;
  float windSpeedMs = 0;
  float ambientTempC = 0;
  float panelTempC = 0;
  float humidityPct = 0;
  float soilingIndex = 0;
  bool gridAvailable = false;
  bool emergencyStop = true;
  bool bmsFault = true;
  bool inverterFault = true;
  bool leakDetected = true;
  bool sensorValid = false;
};

struct ActuatorCommand {
  bool pvContactor = false;
  bool windContactor = false;
  bool windBrake = true;
  bool batteryContactor = false;
  bool gridContactor = false;
  bool firstFlushValve = false;
  bool storageValve = false;
  bool overflowValve = false;
  bool cleaningPump = false;
  bool filtrationPump = false;
  bool loadShedRelay = true;
};

struct PowerState {
  float renewableKw = 0;
  float demandKw = 0;
  float batteryChargeKw = 0;
  float batteryDischargeKw = 0;
  float gridImportKw = 0;
  float gridExportKw = 0;
  float curtailedKw = 0;
  float loadShedKw = 0;
  float reserveSoc = 20;
};

struct WaterState {
  float rainEventMm = 0;
  float captureRateLpm = 0;
  bool firstFlushActive = false;
  bool storageActive = false;
  bool overflowActive = false;
};

struct AlarmFlags {
  uint32_t mask = 0;
  bool critical = false;
};

enum AlarmBit : uint32_t {
  ALARM_ESTOP = 1UL << 0,
  ALARM_BMS = 1UL << 1,
  ALARM_INVERTER = 1UL << 2,
  ALARM_LEAK = 1UL << 3,
  ALARM_BATTERY_TEMP = 1UL << 4,
  ALARM_BATTERY_LOW = 1UL << 5,
  ALARM_TANK_HIGH = 1UL << 6,
  ALARM_WATER_QUALITY = 1UL << 7,
  ALARM_GRID = 1UL << 8,
  ALARM_SENSOR = 1UL << 9,
  ALARM_WATCHDOG = 1UL << 10,
};

struct ControlRequest {
  bool manualEnabled = false;
  OperatingMode requestedMode = OperatingMode::NORMAL;
  uint32_t validUntilMs = 0;
};

struct ControlResult {
  OperatingMode mode = OperatingMode::STARTUP;
  ActuatorCommand outputs;
  PowerState power;
  WaterState water;
  AlarmFlags alarms;
  bool cleaningEligible = false;
  uint32_t cleaningRemainingMs = 0;
  const char* decision = "Boot validation";
};

const char* modeName(OperatingMode mode);
OperatingMode parseMode(const String& value);

