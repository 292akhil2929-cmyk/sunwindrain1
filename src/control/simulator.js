import { DEFAULT_CONFIG, projectBatterySoc } from "./engine.js";

export const SCENARIOS = Object.freeze({
  CLEAR: "CLEAR_DAY",
  DUST: "DUST_EVENT",
  STORM: "STORM_FRONT",
  OUTAGE: "GRID_OUTAGE",
});

export function createInitialSensors() {
  return {
    timestamp: Date.now(),
    solarIrradianceWm2: 760,
    panelTempC: 42,
    pvPowerKw: 2.32,
    windSpeedMs: 3.1,
    windPowerKw: 0.28,
    rainfallMmHr: 0,
    ambientTempC: 34,
    humidityPct: 48,
    loadPowerKw: 1.74,
    batterySoc: 68,
    batteryVoltageV: 25.8,
    batteryCurrentA: 0,
    batteryTempC: 33,
    tankLevelPct: 62,
    waterTurbidityNtu: 1.4,
    waterFlowLpm: 0,
    soilingIndex: 0.11,
    gridAvailable: true,
    inverterFault: false,
    bmsFault: false,
    leakDetected: false,
    emergencyStop: false,
  };
}

export function advanceSimulation({ sensors, result, scenario, elapsedSeconds, dtSeconds = 60, config = DEFAULT_CONFIG }) {
  const wave = Math.sin(elapsedSeconds / 420);
  const jitter = Math.sin(elapsedSeconds / 37) * 0.04;
  let irradiance = 760 + wave * 110;
  let wind = 3.1 + Math.sin(elapsedSeconds / 95) * 1.1;
  let rain = 0;
  let gridAvailable = true;
  let soilingDelta = 0.00005 * dtSeconds / 60;
  let humidity = 48;
  let ambient = 34 + wave * 2;

  if (scenario === SCENARIOS.DUST) {
    irradiance = 640 + wave * 80;
    wind = 4.2 + Math.sin(elapsedSeconds / 55) * 1.4;
    soilingDelta = 0.0018 * dtSeconds / 60;
    humidity = 34;
  } else if (scenario === SCENARIOS.STORM) {
    irradiance = 85 + Math.max(0, wave * 40);
    wind = 11.8 + Math.sin(elapsedSeconds / 30) * 4.4;
    rain = 8.5 + Math.sin(elapsedSeconds / 44) * 3.5;
    humidity = 91;
    ambient = 25;
    soilingDelta = -0.0007 * dtSeconds / 60;
  } else if (scenario === SCENARIOS.OUTAGE) {
    gridAvailable = false;
    irradiance = 520 + wave * 170;
    wind = 2.3 + Math.sin(elapsedSeconds / 75) * 0.8;
  }

  const cleaningRate = result?.outputs.cleaningPump ? 0.035 * dtSeconds / 60 : 0;
  const soilingIndex = clamp(sensors.soilingIndex + soilingDelta - cleaningRate, 0.01, 0.35);
  const pvEfficiency = Math.max(0.55, 1 - soilingIndex * 1.45 - Math.max(0, sensors.panelTempC - 25) * 0.0035);
  const pvPowerKw = Math.max(0, irradiance / 1000 * 3.6 * pvEfficiency);
  const windPowerKw = wind < config.windCutInMs || wind >= config.windCutOutMs ? 0 : Math.min(1.2, 0.011 * Math.pow(wind, 3));
  const captureLpm = result?.water.captureRateLpm || 0;
  const cleaningUseLpm = result?.water.cleaningLitresPerMinute || 0;
  const tankDeltaLitres = (captureLpm - cleaningUseLpm) * dtSeconds / 60;
  const tankCapacityLitres = 420;
  const tankLevelPct = clamp(sensors.tankLevelPct + tankDeltaLitres / tankCapacityLitres * 100, 0, 100);
  const batterySoc = result ? projectBatterySoc(sensors.batterySoc, result.power, dtSeconds, config) : sensors.batterySoc;
  const batteryNetKw = (result?.power.batteryChargeKw || 0) - (result?.power.batteryDischargeKw || 0);

  return {
    ...sensors,
    timestamp: sensors.timestamp + dtSeconds * 1000,
    solarIrradianceWm2: round(irradiance),
    panelTempC: round(ambient + irradiance * 0.024, 1),
    pvPowerKw: round(pvPowerKw),
    windSpeedMs: round(wind, 1),
    windPowerKw: round(windPowerKw),
    rainfallMmHr: round(Math.max(0, rain), 1),
    ambientTempC: round(ambient, 1),
    humidityPct: round(humidity),
    loadPowerKw: round(1.72 + Math.sin(elapsedSeconds / 65) * 0.38 + jitter),
    batterySoc,
    batteryVoltageV: round(24.2 + batterySoc * 0.028, 1),
    batteryCurrentA: round(batteryNetKw * 1000 / Math.max(1, sensors.batteryVoltageV), 1),
    batteryTempC: round(clamp(sensors.batteryTempC + Math.abs(batteryNetKw) * 0.015 - 0.02, ambient, 56), 1),
    tankLevelPct: round(tankLevelPct, 1),
    waterTurbidityNtu: scenario === SCENARIOS.STORM ? 2.8 : 1.4,
    waterFlowLpm: round(captureLpm, 1),
    soilingIndex: round(soilingIndex, 3),
    gridAvailable,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, precision = 2) {
  return Number(value.toFixed(precision));
}

