#pragma once

#include <Arduino.h>

namespace BoardPins {
// Reference mapping for ESP32-S3-DevKitC-1. Validate against the final PCB.
constexpr uint8_t PV_POWER = 1;
constexpr uint8_t WIND_POWER = 2;
constexpr uint8_t LOAD_POWER = 3;
constexpr uint8_t BATTERY_VOLTAGE = 4;
constexpr uint8_t BATTERY_CURRENT = 5;
constexpr uint8_t TANK_LEVEL = 6;
constexpr uint8_t TURBIDITY = 7;
constexpr uint8_t IRRADIANCE = 8;
constexpr uint8_t WIND_SPEED = 9;
constexpr uint8_t RAIN_RATE = 10;
constexpr uint8_t BATTERY_TEMP = 11;
constexpr uint8_t PANEL_TEMP = 12;
constexpr uint8_t AMBIENT_TEMP = 13;

constexpr uint8_t GRID_OK = 14;
constexpr uint8_t E_STOP = 15;
constexpr uint8_t BMS_FAULT = 16;
constexpr uint8_t INVERTER_FAULT = 17;
constexpr uint8_t LEAK = 18;

constexpr uint8_t PV_CONTACTOR = 35;
constexpr uint8_t WIND_CONTACTOR = 36;
constexpr uint8_t WIND_BRAKE = 37;
constexpr uint8_t BATTERY_CONTACTOR = 38;
constexpr uint8_t GRID_CONTACTOR = 39;
constexpr uint8_t FIRST_FLUSH_VALVE = 40;
constexpr uint8_t STORAGE_VALVE = 41;
constexpr uint8_t OVERFLOW_VALVE = 42;
constexpr uint8_t CLEANING_PUMP = 47;
constexpr uint8_t FILTRATION_PUMP = 48;
constexpr uint8_t LOAD_SHED = 21;
}

struct AnalogScale {
  float zeroMv;
  float fullScaleMv;
  float engineeringMin;
  float engineeringMax;
};

namespace Calibration {
// Defaults assume isolated 0.5–2.5 V transducers. Replace with calibration data.
constexpr AnalogScale PV_KW{500, 2500, 0, 5};
constexpr AnalogScale WIND_KW{500, 2500, 0, 2};
constexpr AnalogScale LOAD_KW{500, 2500, 0, 5};
constexpr AnalogScale BATTERY_V{500, 2500, 18, 30};
constexpr AnalogScale BATTERY_A{500, 2500, -100, 100};
constexpr AnalogScale TANK_PCT{500, 2500, 0, 100};
constexpr AnalogScale TURBIDITY_NTU{500, 2500, 0, 10};
constexpr AnalogScale IRRADIANCE{500, 2500, 0, 1200};
constexpr AnalogScale WIND_MS{500, 2500, 0, 25};
constexpr AnalogScale RAIN_MM_HR{500, 2500, 0, 80};
constexpr AnalogScale TEMP_C{500, 2500, -10, 80};
}

struct ControllerConfig {
  float batteryMinSoc = 20;
  float batteryCriticalSoc = 10;
  float batteryMaxSoc = 95;
  float batteryStormReserveSoc = 35;
  float batteryMaxChargeKw = 3.2;
  float batteryMaxDischargeKw = 3.0;
  float batteryHighTempC = 50;
  float batteryCriticalTempC = 58;
  float windCutInMs = 1.5;
  float windCutOutMs = 15;
  float windStormMs = 12;
  float rainStormMmHr = 3;
  float rainCaptureStartMmHr = 0.2;
  float firstFlushMm = 1.2;
  float tankCleaningReservePct = 25;
  float tankHighPct = 95;
  float cleaningSoilingThreshold = 0.15;
  float cleaningAutoThreshold = 0.18;
  float cleaningMaxWindMs = 5;
  float cleaningMaxIrradianceWm2 = 250;
  float cleaningMaxPanelTempC = 45;
  uint32_t cleaningDurationMs = 180000;
  uint32_t startupValidationMs = 5000;
  uint32_t sensorTimeoutMs = 3000;
  uint32_t manualCommandTtlMs = 300000;
};

