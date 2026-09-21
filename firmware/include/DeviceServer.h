#pragma once

#include <WebServer.h>

#include "WelOsTypes.h"

class DeviceServer {
 public:
  DeviceServer();
  void begin(const String& deviceKey);
  void update(const SensorSnapshot& sensors, const ControlResult& result);
  void handle();
  ControlRequest request() const;
  bool rebootRequested();

 private:
  WebServer server_;
  String deviceKey_;
  SensorSnapshot sensors_;
  ControlResult result_;
  ControlRequest request_;
  bool reboot_ = false;

  bool authorized();
  void sendStatus();
  void sendCommand();
  void sendProvision();
  void sendHealth();
  void sendLocalConsole();
  String statusJson() const;
};
