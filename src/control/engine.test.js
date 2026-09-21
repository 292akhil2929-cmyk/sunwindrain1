import test from "node:test";
import assert from "node:assert/strict";
import { createControllerState, DEFAULT_CONFIG, evaluateController, MODES } from "./engine.js";
import { createInitialSensors } from "./simulator.js";

const evaluate = (overrides = {}, stateOverrides = {}, manual = {}) => evaluateController({
  sensors: { ...createInitialSensors(), ...overrides },
  previousState: { ...createControllerState(), uptimeSeconds: 10, ...stateOverrides },
  manual,
  dtSeconds: 60,
});

test("renewable surplus charges battery before exporting", () => {
  const result = evaluate({ pvPowerKw: 3, windPowerKw: 0.6, loadPowerKw: 1.2, batterySoc: 50 });
  assert.equal(result.mode, MODES.NORMAL);
  assert.ok(result.power.batteryChargeKw > 2);
  assert.equal(result.power.gridImportKw, 0);
});

test("load deficit discharges battery above reserve", () => {
  const result = evaluate({ pvPowerKw: 0.2, windPowerKw: 0, loadPowerKw: 2.2, batterySoc: 70 });
  assert.ok(result.power.batteryDischargeKw > 1.9);
  assert.equal(result.power.gridImportKw, 0);
});

test("emergency stop forces fail-safe isolation", () => {
  const result = evaluate({ emergencyStop: true });
  assert.equal(result.mode, MODES.FAULT);
  assert.equal(result.outputs.windBrake, true);
  assert.equal(result.outputs.batteryContactor, false);
  assert.equal(result.outputs.cleaningPump, false);
});

test("safe high-soiling conditions start cleaning", () => {
  const result = evaluate({ soilingIndex: 0.21, tankLevelPct: 70, windSpeedMs: 2, solarIrradianceWm2: 80, panelTempC: 31, pvPowerKw: 0.2 });
  assert.equal(result.mode, MODES.CLEANING);
  assert.equal(result.outputs.cleaningPump, true);
});

test("high wind blocks cleaning request", () => {
  const result = evaluate({ soilingIndex: 0.22, tankLevelPct: 70, windSpeedMs: 7, solarIrradianceWm2: 80 }, {}, { enabled: true, requestedMode: MODES.CLEANING });
  assert.notEqual(result.mode, MODES.CLEANING);
  assert.equal(result.cleaning.eligible, false);
});

test("unsafe weather aborts an active cleaning cycle", () => {
  const result = evaluate(
    { windSpeedMs: 13, soilingIndex: 0.2 },
    { mode: MODES.CLEANING, cleaningRemainingSeconds: 120 },
  );
  assert.equal(result.mode, MODES.STORM);
  assert.equal(result.outputs.cleaningPump, false);
  assert.equal(result.nextState.cleaningRemainingSeconds, 0);
});

test("supervisor can request conservation without bypassing reserve protection", () => {
  const requested = evaluate({}, {}, { enabled: true, requestedMode: MODES.CONSERVE });
  assert.equal(requested.mode, MODES.CONSERVE);
  const protectedResult = evaluate(
    { gridAvailable: false, batterySoc: DEFAULT_CONFIG.batteryStormReserveSoc },
    {},
    { enabled: true, requestedMode: MODES.NORMAL },
  );
  assert.equal(protectedResult.mode, MODES.CONSERVE);
});

test("storm capture uses first flush before storage", () => {
  const result = evaluate({ rainfallMmHr: 10, windSpeedMs: 12, solarIrradianceWm2: 40, pvPowerKw: 0.1 });
  assert.equal(result.mode, MODES.STORM);
  assert.equal(result.outputs.firstFlushValve, true);
  assert.equal(result.outputs.storageValve, false);
});

test("grid outage protects battery reserve and sheds unmet load", () => {
  const result = evaluate({ gridAvailable: false, batterySoc: DEFAULT_CONFIG.batteryStormReserveSoc, pvPowerKw: 0, windPowerKw: 0, loadPowerKw: 2 });
  assert.equal(result.mode, MODES.CONSERVE);
  assert.equal(result.power.batteryDischargeKw, 0);
  assert.equal(result.outputs.loadShedRelay, true);
});
