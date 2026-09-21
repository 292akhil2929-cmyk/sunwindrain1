# WELOS Device API v1

Base URL: `http://welos-device/` on the trusted local control network.

## Read status

`GET /api/v1/status`

Returns firmware and device identity, uptime, mode, current decision, alarm bitmask, sensor readings, derived power/water values, RSSI and commanded actuator states. Reading status does not require the operator key.

## Health

`GET /health`

Returns `{"status":"ok"}` or `{"status":"fault"}`. Health reflects the device safety state, not internet availability.

## Command

`POST /api/v1/command`

Required headers:

```text
Content-Type: application/json
X-WELOS-Key: <128-bit per-device key>
```

Body:

```json
{
  "manual": true,
  "mode": "NORMAL | CONSERVE | STORM | CLEANING",
  "reboot": false
}
```

Commands receive a five-minute lease. Safety and reserve conditions override them. A reboot first forces all outputs to their safe state.

## Provision Wi-Fi

`POST /api/v1/provision` uses the same authentication headers and accepts `ssid` plus an 8–63 character password. The device stores the credentials in NVS and reboots. This route should be used only from the commissioning access point or an isolated maintenance network.

## Alarm bits

| Bit | Meaning |
| ---: | --- |
| 0 | Emergency stop |
| 1 | BMS fault |
| 2 | Inverter fault |
| 3 | Water leak |
| 4 | Battery temperature |
| 5 | Low battery |
| 6 | Tank high |
| 7 | Water quality |
| 8 | Grid unavailable |
| 9 | Sensor invalid/stale |
| 10 | Watchdog fault |

