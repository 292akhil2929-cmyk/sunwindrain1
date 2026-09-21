# WELOS Control OS

WELOS Control OS is a deterministic supervisory controller and operator console for a combined solar, wind, rainwater, battery and automated panel-cleaning installation. The browser build is a deployable reference implementation and simulator. It is not safety-certified field firmware.

## Control priority

The engine evaluates every cycle in this order:

1. Emergency and electrical interlocks.
2. Battery management and reserve protection.
3. Storm capture and high-wind protection.
4. Cleaning eligibility and automatic maintenance.
5. Supervisor requests.
6. Normal renewable optimization.

Emergency-stop, BMS, inverter, leak, temperature and wind protections cannot be bypassed by manual mode. A critical alarm opens the generation and storage contactors, applies the turbine brake, stops both pumps, closes the water valves and sheds the controlled load. The grid contactor remains available only when the grid and inverter are healthy.

## Automatic mode switching

| Condition | Result |
| --- | --- |
| Controller startup validation | `STARTUP` |
| Critical interlock | `FAULT` |
| Rain at/above 3 mm/h or wind at/above 12 m/s | `STORM` |
| Grid loss or battery at/below 25% | `CONSERVE` |
| Soiling at/above 18%, water available and cleaning envelope safe | `CLEANING` |
| No higher-priority condition | `NORMAL` |

The cleaning envelope also requires at least 15% soiling, wind below 5 m/s, irradiance at or below 250 W/m², panel temperature at or below 45°C, at least 25% tank volume, acceptable water quality and no active rain. An automatic cycle starts at 18% soiling and runs for up to 180 seconds. Unsafe conditions cancel it immediately.

## Energy routing

- Renewable power serves the site load first.
- Surplus charges the battery up to its charge-power limit and maximum state of charge.
- Remaining surplus is exported only when the grid is available.
- A deficit discharges the battery down to the active reserve floor.
- Remaining deficit imports from the grid. In islanded operation, non-critical load is shed.
- Normal operation protects a 20% floor. Storm and islanded operation protect a 35% reserve.

## Rainwater routing

- The first 1.2 mm of a rain event are diverted through the first-flush route.
- After first flush, acceptable water is filtered into storage.
- A full tank, excessive turbidity or a safety fault routes water to overflow.
- Capture is calculated from rainfall intensity, roof area and collection efficiency.

## Software structure

- `src/control/engine.js`: pure deterministic decision engine.
- `src/control/simulator.js`: environmental and machine simulator.
- `src/control/main.jsx`: operator console and event journal.
- `src/control/engine.test.js`: mode, safety and routing tests.
- `control.html`: independent multi-page entry point; the public landing page is unchanged.

## Field integration boundary

For real equipment, replace the simulator with an authenticated, heartbeat-monitored transport adapter (for example an industrial gateway using MQTT over TLS or Modbus TCP behind the gateway). Map calibrated sensor readings into the engine's sensor object and map approved outputs into the PLC/MCU command register. The field controller must retain independent hard-wired protection for emergency stop, overcurrent, battery BMS isolation, turbine overspeed and pump dry-run.

Before actuation, validate sensor ranges, relay polarity, safe default states, watchdog timeouts, contactor feedback, debounce intervals, energy-meter calibration, valve travel, local electrical code and the battery/turbine manufacturer's operating envelope. Run hardware-in-the-loop tests and a formal hazard review before enabling outputs.

## Commands

```bash
npm run dev
npm run test:control
npm run build
```

Open `/control.html` for the console. The simulation advances one minute for every real-time second and exposes clear-day, dust, storm and grid-outage profiles.
