export const MODES = Object.freeze({
  STARTUP: "STARTUP",
  NORMAL: "NORMAL",
  CONSERVE: "CONSERVE",
  STORM: "STORM",
  CLEANING: "CLEANING",
  MANUAL: "MANUAL",
  FAULT: "FAULT",
});

export const DEFAULT_CONFIG = Object.freeze({
  batteryCapacityKwh: 24,
  batteryMinSoc: 20,
  batteryCriticalSoc: 10,
  batteryMaxSoc: 95,
  batteryStormReserveSoc: 35,
  batteryMaxChargeKw: 3.2,
  batteryMaxDischargeKw: 3.0,
  batteryChargeEfficiency: 0.94,
  batteryDischargeEfficiency: 0.95,
  batteryHighTempC: 50,
  batteryCriticalTempC: 58,
  windCutInMs: 1.5,
  windCutOutMs: 15,
  windStormMs: 12,
  rainStormMmHr: 3,
  rainCaptureStartMmHr: 0.2,
  firstFlushMm: 1.2,
  tankCleaningReservePct: 25,
  tankHighPct: 95,
  cleaningSoilingThreshold: 0.15,
  cleaningAutoThreshold: 0.18,
  cleaningMaxWindMs: 5,
  cleaningMaxIrradianceWm2: 250,
  cleaningMaxPanelTempC: 45,
  cleaningDurationSeconds: 180,
  cleaningWaterLitres: 12,
  cleaningPumpKw: 0.12,
  startupSeconds: 5,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, precision = 2) => Number(value.toFixed(precision));

export function createControllerState() {
  return {
    mode: MODES.STARTUP,
    uptimeSeconds: 0,
    rainEventMm: 0,
    cleaningRemainingSeconds: 0,
    cleaningCycles: 0,
    energyGeneratedKwh: 0,
    gridImportedKwh: 0,
    waterCapturedLitres: 0,
    lastDecision: "Controller boot sequence",
    lastTransitionAt: Date.now(),
  };
}

function alarm(id, severity, title, detail, latched = false) {
  return { id, severity, title, detail, latched };
}

function evaluateAlarms(sensors, config) {
  const alarms = [];
  if (sensors.emergencyStop) alarms.push(alarm("E_STOP", "critical", "Emergency stop active", "All non-essential actuators are isolated.", true));
  if (sensors.bmsFault) alarms.push(alarm("BMS_FAULT", "critical", "Battery management fault", "Battery contactor opened; service required.", true));
  if (sensors.inverterFault) alarms.push(alarm("INVERTER_FAULT", "critical", "Inverter fault", "PV, wind and battery conversion paths are isolated.", true));
  if (sensors.leakDetected) alarms.push(alarm("WATER_LEAK", "critical", "Water leak detected", "Water valves and cleaning pump closed.", true));
  if (sensors.batteryTempC >= config.batteryCriticalTempC) alarms.push(alarm("BATTERY_TEMP_CRITICAL", "critical", "Battery temperature critical", `${round(sensors.batteryTempC, 1)}°C exceeds the shutdown limit.`, true));
  else if (sensors.batteryTempC >= config.batteryHighTempC) alarms.push(alarm("BATTERY_TEMP_HIGH", "warning", "Battery temperature high", "Charging and discharge power are derated."));
  if (sensors.batterySoc <= config.batteryCriticalSoc) alarms.push(alarm("BATTERY_SOC_CRITICAL", "critical", "Battery reserve critical", "Non-critical loads will be shed if grid power is unavailable."));
  else if (sensors.batterySoc <= config.batteryMinSoc) alarms.push(alarm("BATTERY_SOC_LOW", "warning", "Battery reserve low", "Discharge is suspended until renewable surplus recovers the reserve."));
  if (sensors.tankLevelPct >= config.tankHighPct) alarms.push(alarm("TANK_HIGH", "info", "Water tank near capacity", "Overflow routing is active."));
  if (sensors.waterTurbidityNtu > 5) alarms.push(alarm("WATER_QUALITY", "warning", "Water quality outside target", "Storage inlet is isolated pending filtration check."));
  if (!sensors.gridAvailable) alarms.push(alarm("GRID_OUTAGE", "warning", "Grid unavailable", "Islanded operation and reserve protection are active."));
  return alarms;
}

function cleaningEligibility(sensors, config) {
  const blockers = [];
  if (sensors.soilingIndex < config.cleaningSoilingThreshold) blockers.push("Soiling below trigger");
  if (sensors.tankLevelPct < config.tankCleaningReservePct) blockers.push("Water reserve too low");
  if (sensors.windSpeedMs >= config.cleaningMaxWindMs) blockers.push("Wind speed unsafe");
  if (sensors.rainfallMmHr >= config.rainCaptureStartMmHr) blockers.push("Rain capture active");
  if (sensors.solarIrradianceWm2 > config.cleaningMaxIrradianceWm2) blockers.push("Irradiance too high");
  if (sensors.panelTempC > config.cleaningMaxPanelTempC) blockers.push("Panel temperature too high");
  if (sensors.leakDetected) blockers.push("Leak interlock active");
  if (sensors.waterTurbidityNtu > 5) blockers.push("Water quality unsuitable");
  return { eligible: blockers.length === 0, blockers };
}

function safeFaultOutputs(sensors) {
  return {
    pvContactor: false,
    windContactor: false,
    windBrake: true,
    batteryContactor: false,
    gridContactor: Boolean(sensors.gridAvailable && !sensors.inverterFault),
    firstFlushValve: false,
    storageValve: false,
    overflowValve: false,
    cleaningPump: false,
    filtrationPump: false,
    loadShedRelay: true,
  };
}

export function evaluateController({ sensors, previousState, manual = {}, config = DEFAULT_CONFIG, dtSeconds = 1 }) {
  const previous = previousState || createControllerState();
  const alarms = evaluateAlarms(sensors, config);
  const criticalFault = alarms.some((item) => item.severity === "critical" && item.id !== "BATTERY_SOC_CRITICAL");
  const cleaning = cleaningEligibility(sensors, config);
  const startup = previous.uptimeSeconds < config.startupSeconds;
  const storm = sensors.windSpeedMs >= config.windStormMs || sensors.rainfallMmHr >= config.rainStormMmHr;
  const manualCleaning = manual.enabled && manual.requestedMode === MODES.CLEANING;
  const automaticCleaning = sensors.soilingIndex >= config.cleaningAutoThreshold && cleaning.eligible;
  const cleaningActive = (previous.cleaningRemainingSeconds > 0 || manualCleaning || automaticCleaning) && cleaning.eligible;

  let mode = MODES.NORMAL;
  if (criticalFault) mode = MODES.FAULT;
  else if (startup) mode = MODES.STARTUP;
  else if (storm) mode = MODES.STORM;
  else if (cleaningActive) mode = MODES.CLEANING;
  else if (!sensors.gridAvailable || sensors.batterySoc <= config.batteryMinSoc + 5) mode = MODES.CONSERVE;
  else if (manual.enabled && [MODES.NORMAL, MODES.CONSERVE, MODES.STORM].includes(manual.requestedMode)) mode = manual.requestedMode;
  else if (manual.enabled) mode = MODES.MANUAL;

  if (mode === MODES.FAULT) {
    const nextState = {
      ...previous,
      mode,
      uptimeSeconds: previous.uptimeSeconds + dtSeconds,
      cleaningRemainingSeconds: 0,
      lastDecision: "Safety interlock: energy and water actuators isolated",
      lastTransitionAt: previous.mode === mode ? previous.lastTransitionAt : Date.now(),
    };
    return { mode, alarms, cleaning, outputs: safeFaultOutputs(sensors), power: zeroPower(sensors), water: zeroWater(), nextState };
  }

  const windSafe = sensors.windSpeedMs >= config.windCutInMs && sensors.windSpeedMs < config.windCutOutMs;
  const windBrake = !windSafe || mode === MODES.STORM && sensors.windSpeedMs >= config.windCutOutMs;
  const converterHealthy = !sensors.inverterFault && !sensors.emergencyStop;
  const pvAvailableKw = converterHealthy ? Math.max(0, sensors.pvPowerKw) : 0;
  const windAvailableKw = converterHealthy && !windBrake ? Math.max(0, sensors.windPowerKw) : 0;
  const cleaningPumpKw = mode === MODES.CLEANING ? config.cleaningPumpKw : 0;
  const demandKw = Math.max(0, sensors.loadPowerKw) + cleaningPumpKw;
  const renewableKw = pvAvailableKw + windAvailableKw;
  const netKw = renewableKw - demandKw;
  const reserveSoc = mode === MODES.STORM || !sensors.gridAvailable ? config.batteryStormReserveSoc : config.batteryMinSoc;
  const batteryDerate = sensors.batteryTempC >= config.batteryHighTempC ? 0.35 : 1;
  const batteryCanCharge = !sensors.bmsFault && sensors.batterySoc < config.batteryMaxSoc;
  const batteryCanDischarge = !sensors.bmsFault && sensors.batterySoc > reserveSoc;

  let batteryChargeKw = 0;
  let batteryDischargeKw = 0;
  let gridImportKw = 0;
  let gridExportKw = 0;
  let curtailedKw = 0;
  let loadShedKw = 0;

  if (netKw >= 0) {
    batteryChargeKw = batteryCanCharge ? Math.min(netKw, config.batteryMaxChargeKw * batteryDerate) : 0;
    const remaining = Math.max(0, netKw - batteryChargeKw);
    if (sensors.gridAvailable) gridExportKw = remaining;
    else curtailedKw = remaining;
  } else {
    const deficit = Math.abs(netKw);
    batteryDischargeKw = batteryCanDischarge ? Math.min(deficit, config.batteryMaxDischargeKw * batteryDerate) : 0;
    const remaining = Math.max(0, deficit - batteryDischargeKw);
    if (sensors.gridAvailable) gridImportKw = remaining;
    else loadShedKw = remaining;
  }

  const raining = sensors.rainfallMmHr >= config.rainCaptureStartMmHr;
  const rainEventMm = raining ? previous.rainEventMm + sensors.rainfallMmHr * dtSeconds / 3600 : 0;
  const firstFlush = raining && rainEventMm < config.firstFlushMm;
  const qualitySafe = sensors.waterTurbidityNtu <= 5 && !sensors.leakDetected;
  const tankHasCapacity = sensors.tankLevelPct < config.tankHighPct;
  const storageValve = raining && !firstFlush && qualitySafe && tankHasCapacity;
  const overflowValve = raining && (!tankHasCapacity || !qualitySafe);
  const captureRateLpm = storageValve ? Math.max(0, sensors.rainfallMmHr * 1.8) : 0;

  let cleaningRemainingSeconds = previous.cleaningRemainingSeconds;
  let cleaningCycles = previous.cleaningCycles;
  if (!cleaning.eligible) cleaningRemainingSeconds = 0;
  if (mode === MODES.CLEANING && cleaningRemainingSeconds <= 0) {
    cleaningRemainingSeconds = config.cleaningDurationSeconds;
    cleaningCycles += 1;
  }
  cleaningRemainingSeconds = Math.max(0, cleaningRemainingSeconds - dtSeconds);

  const outputs = {
    pvContactor: converterHealthy,
    windContactor: converterHealthy && !windBrake,
    windBrake,
    batteryContactor: !sensors.bmsFault,
    gridContactor: sensors.gridAvailable,
    firstFlushValve: firstFlush,
    storageValve,
    overflowValve,
    cleaningPump: mode === MODES.CLEANING,
    filtrationPump: storageValve,
    loadShedRelay: loadShedKw > 0.01,
  };

  const power = {
    pvKw: round(pvAvailableKw),
    windKw: round(windAvailableKw),
    renewableKw: round(renewableKw),
    demandKw: round(demandKw),
    servedLoadKw: round(Math.max(0, demandKw - loadShedKw)),
    batteryChargeKw: round(batteryChargeKw),
    batteryDischargeKw: round(batteryDischargeKw),
    gridImportKw: round(gridImportKw),
    gridExportKw: round(gridExportKw),
    curtailedKw: round(curtailedKw),
    loadShedKw: round(loadShedKw),
    reserveSoc,
  };

  const water = {
    rainEventMm: round(rainEventMm, 3),
    captureRateLpm: round(captureRateLpm),
    firstFlushActive: firstFlush,
    storageActive: storageValve,
    overflowActive: overflowValve,
    cleaningLitresPerMinute: mode === MODES.CLEANING ? round(config.cleaningWaterLitres / (config.cleaningDurationSeconds / 60)) : 0,
  };

  const decision = describeDecision(mode, power, outputs, cleaning);
  const hours = dtSeconds / 3600;
  const nextState = {
    ...previous,
    mode,
    uptimeSeconds: previous.uptimeSeconds + dtSeconds,
    rainEventMm,
    cleaningRemainingSeconds,
    cleaningCycles,
    energyGeneratedKwh: previous.energyGeneratedKwh + renewableKw * hours,
    gridImportedKwh: previous.gridImportedKwh + gridImportKw * hours,
    waterCapturedLitres: previous.waterCapturedLitres + captureRateLpm * dtSeconds / 60,
    lastDecision: decision,
    lastTransitionAt: previous.mode === mode ? previous.lastTransitionAt : Date.now(),
  };

  return { mode, alarms, cleaning, outputs, power, water, nextState };
}

function zeroPower(sensors) {
  return { pvKw: 0, windKw: 0, renewableKw: 0, demandKw: round(sensors.loadPowerKw || 0), servedLoadKw: 0, batteryChargeKw: 0, batteryDischargeKw: 0, gridImportKw: 0, gridExportKw: 0, curtailedKw: 0, loadShedKw: round(sensors.loadPowerKw || 0), reserveSoc: DEFAULT_CONFIG.batteryMinSoc };
}

function zeroWater() {
  return { rainEventMm: 0, captureRateLpm: 0, firstFlushActive: false, storageActive: false, overflowActive: false, cleaningLitresPerMinute: 0 };
}

function describeDecision(mode, power, outputs, cleaning) {
  if (mode === MODES.STARTUP) return "Validating sensors and actuator interlocks";
  if (mode === MODES.CLEANING) return "Rainwater cleaning cycle active under safe conditions";
  if (mode === MODES.STORM) return outputs.windBrake ? "Storm mode: turbine braked, rain capture prioritized" : "Storm mode: reserve charging and rain capture prioritized";
  if (power.loadShedKw > 0) return `Island mode: shedding ${power.loadShedKw.toFixed(2)} kW to protect reserve`;
  if (power.batteryChargeKw > 0) return `Renewables serving loads; charging battery at ${power.batteryChargeKw.toFixed(2)} kW`;
  if (power.batteryDischargeKw > 0) return `Battery supporting loads at ${power.batteryDischargeKw.toFixed(2)} kW`;
  if (power.gridImportKw > 0) return `Grid supplementing ${power.gridImportKw.toFixed(2)} kW while battery reserve is protected`;
  if (!cleaning.eligible && cleaning.blockers.length) return `Normal routing; cleaning deferred: ${cleaning.blockers[0]}`;
  return "Renewable generation matched to active loads";
}

export function projectBatterySoc(currentSoc, power, dtSeconds, config = DEFAULT_CONFIG) {
  const chargedKwh = power.batteryChargeKw * config.batteryChargeEfficiency * dtSeconds / 3600;
  const dischargedKwh = power.batteryDischargeKw / config.batteryDischargeEfficiency * dtSeconds / 3600;
  const deltaPct = (chargedKwh - dischargedKwh) / config.batteryCapacityKwh * 100;
  return round(clamp(currentSoc + deltaPct, 0, 100), 2);
}
