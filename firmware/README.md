# WELOS Device OS firmware

This directory contains the autonomous device firmware for the ESP32-S3-DevKitC-1 reference controller. It operates locally without the web dashboard or an internet connection.

## Implemented runtime

- 250 ms deterministic control cycle.
- Fail-safe startup and sensor freshness checks.
- Normally-closed emergency, BMS, inverter and leak safety loops.
- Solar/wind/load routing, battery reserve logic and load shedding.
- Rain first-flush, filtration, storage and overflow routing.
- Automatic cleaning with live wind, rain, heat, water and quality interlocks.
- Hardware watchdog and safe output state before reboot.
- Five-minute authenticated manual-command lease; commands expire automatically.
- Local read-only status console and JSON API.
- Wi-Fi station mode with a commissioning access-point fallback.
- Unique 128-bit operator key generated on first boot and stored in NVS.

## Reference hardware profile

The firmware is compiled for an ESP32-S3-DevKitC-1 N8. The reference I/O expects:

- isolated 0.5–2.5 V transducers for PV power, wind power, load power, battery voltage/current, tank level, turbidity, irradiance, wind speed, rain rate and temperatures;
- 3.3 V-compatible, normally-closed dry-contact loops for emergency stop, BMS fault, inverter fault, leak detection and grid-good;
- optically isolated driver stages for every contactor, valve, pump, turbine brake and load-shed relay;
- mechanical contactors and protection devices correctly rated for the real DC/AC voltage and fault current.

The ESP32 pins must never directly switch a pump, contactor coil, battery circuit, inverter or mains supply. The reference pin assignment and transducer calibration live in `include/BoardConfig.h` and must be validated against the final PCB.

## Build and flash

Install [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation/index.html), connect the ESP32-S3 over USB, then run:

```bash
pio run -d firmware
pio run -d firmware --target upload
pio device monitor --baud 115200
```

The first serial boot prints the generated operator key. If saved Wi-Fi credentials are unavailable, the device creates `WELOS-SETUP-…`; its password is the first 12 characters of the operator key. Open `http://192.168.4.1/` for read-only telemetry.

Provision site Wi-Fi from a trusted commissioning computer:

```bash
curl -X POST http://192.168.4.1/api/v1/provision \
  -H "Content-Type: application/json" \
  -H "X-WELOS-Key: YOUR_DEVICE_KEY" \
  -d '{"ssid":"SITE_WIFI","password":"SITE_PASSWORD"}'
```

## Command example

```bash
curl -X POST http://welos-device/api/v1/command \
  -H "Content-Type: application/json" \
  -H "X-WELOS-Key: YOUR_DEVICE_KEY" \
  -d '{"manual":true,"mode":"CONSERVE"}'
```

Emergency, sensor, battery, inverter, wind and water interlocks take precedence over remote commands. Every manual command expires after five minutes.

## Required before physical actuation

1. Replace reference calibration values with traceable measurements from the selected transducers.
2. Confirm relay polarity and prove that MCU reset/power loss produces the safe state.
3. Replace or validate the reference battery coulomb counter against the selected BMS.
4. Enable ESP32 secure boot, flash encryption and encrypted NVS for production units.
5. Perform hardware-in-the-loop fault injection for every interlock.
6. Complete electrical protection, grounding, isolation and local-code review with a qualified engineer.

This repository supplies the software stack. It cannot establish the ratings or safety of hardware that has not yet been selected and tested.

