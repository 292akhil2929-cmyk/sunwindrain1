#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_task_wdt.h>

#include "ControlEngine.h"
#include "DeviceServer.h"
#include "HardwareIO.h"

namespace {
constexpr uint32_t CONTROL_PERIOD_MS = 250;
constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;

HardwareIO hardware;
ControlEngine controller;
DeviceServer api;
Preferences preferences;
String deviceKey;
uint32_t lastControlMs = 0;

String randomHex(size_t bytes) {
  static const char hex[] = "0123456789abcdef";
  String value;
  value.reserve(bytes * 2);
  for (size_t i = 0; i < bytes; ++i) {
    const uint8_t byte = static_cast<uint8_t>(esp_random());
    value += hex[byte >> 4];
    value += hex[byte & 0x0F];
  }
  return value;
}

String loadDeviceKey() {
  String key = preferences.getString("device_key", "");
  if (key.length() < 24) {
    key = randomHex(16);
    preferences.putString("device_key", key);
  }
  return key;
}

void startNetwork() {
  const String ssid = preferences.getString("wifi_ssid", "");
  const String pass = preferences.getString("wifi_pass", "");
  if (!ssid.isEmpty()) {
    WiFi.mode(WIFI_STA);
    WiFi.setHostname("welos-device");
    WiFi.begin(ssid.c_str(), pass.c_str());
    const uint32_t started = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - started < WIFI_CONNECT_TIMEOUT_MS) {
      delay(100);
      esp_task_wdt_reset();
    }
  }
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.mode(WIFI_AP_STA);
    const String suffix = String(static_cast<uint32_t>(ESP.getEfuseMac()), HEX).substring(4);
    const String apName = "WELOS-SETUP-" + suffix;
    const String apPassword = deviceKey.substring(0, 12);
    WiFi.softAP(apName.c_str(), apPassword.c_str());
    Serial.printf("Commissioning AP: %s\n", apName.c_str());
    Serial.printf("AP password: %s\n", apPassword.c_str());
    Serial.println("Open http://192.168.4.1/");
  } else {
    Serial.printf("WELOS online: http://%s/\n", WiFi.localIP().toString().c_str());
  }
}
}

void setup() {
  Serial.begin(115200);
  delay(250);
  hardware.begin();
  preferences.begin("welos", false);
  deviceKey = loadDeviceKey();
  Serial.printf("WELOS Device OS %s\n", WELOS_FW_VERSION);
  Serial.printf("Operator key: %s\n", deviceKey.c_str());

  esp_task_wdt_init(8, true);
  esp_task_wdt_add(nullptr);
  startNetwork();
  api.begin(deviceKey);
  controller.reset(millis());
  Serial.println("Controller initialized in fail-safe state.");
}

void loop() {
  const uint32_t now = millis();
  api.handle();
  if (now - lastControlMs >= CONTROL_PERIOD_MS) {
    lastControlMs = now;
    const SensorSnapshot sensors = hardware.sample(now);
    const ControlResult result = controller.evaluate(sensors, api.request(), now);
    hardware.apply(result.outputs);
    api.update(sensors, result);
    esp_task_wdt_reset();
  }
  if (api.rebootRequested()) {
    hardware.forceSafe();
    delay(100);
    ESP.restart();
  }
  delay(2);
}

