#include "DeviceServer.h"

#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>

namespace {
const char LOCAL_CONSOLE[] PROGMEM = R"HTML(
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#071016"><title>WELOS Device</title><style>
body{margin:0;background:#071016;color:#edf2f2;font:14px system-ui}main{max-width:900px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;border-bottom:1px solid #33444d;padding:18px 0}b{color:#ffb000}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:18px}.card{border:1px solid #283943;background:#0b161e;padding:16px}.card span{display:block;color:#8fa0a8;font-size:11px}.card strong{display:block;font:600 24px monospace;margin-top:8px}.status{color:#9bdb4b}pre{white-space:pre-wrap;color:#9cabb2}a{color:#ffb000}</style></head><body><main><header><div><b>welos</b> / DEVICE OS</div><div id="link">CONNECTING</div></header><div class="grid" id="grid"></div><div class="card"><span>DECISION</span><pre id="decision">—</pre></div><p>This local console is read-only. Use the authenticated operator client for commands.</p></main><script>
const fields=[['mode','MODE'],['batterySoc','BATTERY %'],['renewableKw','RENEWABLE kW'],['loadPowerKw','LOAD kW'],['tankLevelPct','WATER %'],['windSpeedMs','WIND m/s']];async function tick(){try{const r=await fetch('/api/v1/status'),d=await r.json();link.textContent='LINK HEALTHY';link.className='status';grid.innerHTML=fields.map(([k,l])=>`<div class="card"><span>${l}</span><strong>${typeof d[k]==='number'?d[k].toFixed(1):d[k]}</strong></div>`).join('');decision.textContent=d.decision+'\nalarms: 0x'+d.alarmMask.toString(16)}catch(e){link.textContent='LINK LOST'}}tick();setInterval(tick,1000)</script></body></html>
)HTML";

void cors(WebServer& server) {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, X-WELOS-Key");
}
}

DeviceServer::DeviceServer() : server_(80) {}

void DeviceServer::begin(const String& deviceKey) {
  deviceKey_ = deviceKey;
  const char* headers[] = {"X-WELOS-Key"};
  server_.collectHeaders(headers, 1);
  server_.on("/", HTTP_GET, [this]() { sendLocalConsole(); });
  server_.on("/health", HTTP_GET, [this]() { sendHealth(); });
  server_.on("/api/v1/status", HTTP_GET, [this]() { sendStatus(); });
  server_.on("/api/v1/command", HTTP_POST, [this]() { sendCommand(); });
  server_.on("/api/v1/provision", HTTP_POST, [this]() { sendProvision(); });
  server_.on("/api/v1/command", HTTP_OPTIONS, [this]() { cors(server_); server_.send(204); });
  server_.onNotFound([this]() { server_.send(404, "application/json", "{\"error\":\"not_found\"}"); });
  server_.begin();
}

void DeviceServer::update(const SensorSnapshot& sensors, const ControlResult& result) {
  sensors_ = sensors;
  result_ = result;
}

void DeviceServer::handle() { server_.handleClient(); }
ControlRequest DeviceServer::request() const { return request_; }
bool DeviceServer::rebootRequested() { const bool value = reboot_; reboot_ = false; return value; }

bool DeviceServer::authorized() {
  const String supplied = server_.header("X-WELOS-Key");
  uint8_t difference = supplied.length() ^ deviceKey_.length();
  const size_t count = std::max(supplied.length(), deviceKey_.length());
  for (size_t i = 0; i < count; ++i) {
    const char a = i < supplied.length() ? supplied[i] : 0;
    const char b = i < deviceKey_.length() ? deviceKey_[i] : 0;
    difference |= static_cast<uint8_t>(a ^ b);
  }
  return difference == 0;
}

String DeviceServer::statusJson() const {
  JsonDocument doc;
  doc["firmware"] = WELOS_FW_VERSION;
  doc["deviceId"] = WiFi.macAddress();
  doc["uptimeMs"] = millis();
  doc["mode"] = modeName(result_.mode);
  doc["decision"] = result_.decision;
  doc["alarmMask"] = result_.alarms.mask;
  doc["critical"] = result_.alarms.critical;
  doc["sensorValid"] = sensors_.sensorValid;
  doc["pvPowerKw"] = sensors_.pvPowerKw;
  doc["windPowerKw"] = sensors_.windPowerKw;
  doc["renewableKw"] = result_.power.renewableKw;
  doc["loadPowerKw"] = sensors_.loadPowerKw;
  doc["batterySoc"] = sensors_.batterySoc;
  doc["batteryVoltageV"] = sensors_.batteryVoltageV;
  doc["batteryCurrentA"] = sensors_.batteryCurrentA;
  doc["batteryTempC"] = sensors_.batteryTempC;
  doc["tankLevelPct"] = sensors_.tankLevelPct;
  doc["rainfallMmHr"] = sensors_.rainfallMmHr;
  doc["windSpeedMs"] = sensors_.windSpeedMs;
  doc["soilingIndex"] = sensors_.soilingIndex;
  doc["captureRateLpm"] = result_.water.captureRateLpm;
  doc["cleaningRemainingMs"] = result_.cleaningRemainingMs;
  doc["rssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
  JsonObject outputs = doc["outputs"].to<JsonObject>();
  outputs["pvContactor"] = result_.outputs.pvContactor;
  outputs["windContactor"] = result_.outputs.windContactor;
  outputs["windBrake"] = result_.outputs.windBrake;
  outputs["batteryContactor"] = result_.outputs.batteryContactor;
  outputs["gridContactor"] = result_.outputs.gridContactor;
  outputs["firstFlushValve"] = result_.outputs.firstFlushValve;
  outputs["storageValve"] = result_.outputs.storageValve;
  outputs["overflowValve"] = result_.outputs.overflowValve;
  outputs["cleaningPump"] = result_.outputs.cleaningPump;
  outputs["filtrationPump"] = result_.outputs.filtrationPump;
  outputs["loadShedRelay"] = result_.outputs.loadShedRelay;
  String json;
  serializeJson(doc, json);
  return json;
}

void DeviceServer::sendStatus() { cors(server_); server_.send(200, "application/json", statusJson()); }
void DeviceServer::sendHealth() { server_.send(200, "application/json", result_.alarms.critical ? "{\"status\":\"fault\"}" : "{\"status\":\"ok\"}"); }
void DeviceServer::sendLocalConsole() { server_.send_P(200, "text/html", LOCAL_CONSOLE); }

void DeviceServer::sendCommand() {
  cors(server_);
  if (!authorized()) { server_.send(401, "application/json", "{\"error\":\"unauthorized\"}"); return; }
  JsonDocument doc;
  if (deserializeJson(doc, server_.arg("plain"))) { server_.send(400, "application/json", "{\"error\":\"invalid_json\"}"); return; }
  request_.manualEnabled = doc["manual"] | false;
  request_.requestedMode = parseMode(String(static_cast<const char*>(doc["mode"] | "NORMAL")));
  request_.validUntilMs = millis() + 300000UL;
  reboot_ = doc["reboot"] | false;
  server_.send(202, "application/json", "{\"accepted\":true,\"ttlSeconds\":300}");
}

void DeviceServer::sendProvision() {
  cors(server_);
  if (!authorized()) { server_.send(401, "application/json", "{\"error\":\"unauthorized\"}"); return; }
  JsonDocument doc;
  if (deserializeJson(doc, server_.arg("plain"))) { server_.send(400, "application/json", "{\"error\":\"invalid_json\"}"); return; }
  const String ssid = String(static_cast<const char*>(doc["ssid"] | ""));
  const String password = String(static_cast<const char*>(doc["password"] | ""));
  if (ssid.isEmpty() || password.length() < 8 || password.length() > 63) {
    server_.send(422, "application/json", "{\"error\":\"ssid_and_8_to_63_character_password_required\"}");
    return;
  }
  Preferences preferences;
  preferences.begin("welos", false);
  preferences.putString("wifi_ssid", ssid);
  preferences.putString("wifi_pass", password);
  preferences.end();
  reboot_ = true;
  server_.send(202, "application/json", "{\"accepted\":true,\"rebooting\":true}");
}
