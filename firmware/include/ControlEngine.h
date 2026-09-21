#pragma once

#include "BoardConfig.h"
#include "WelOsTypes.h"

class ControlEngine {
 public:
  explicit ControlEngine(const ControllerConfig& config = ControllerConfig());
  ControlResult evaluate(const SensorSnapshot& sensors, const ControlRequest& request, uint32_t nowMs);
  void reset(uint32_t nowMs);

 private:
  ControllerConfig config_;
  OperatingMode previousMode_ = OperatingMode::STARTUP;
  uint32_t bootMs_ = 0;
  uint32_t cleaningEndsMs_ = 0;
  float rainEventMm_ = 0;
  uint32_t lastTickMs_ = 0;

  AlarmFlags alarmsFor(const SensorSnapshot& sensors, uint32_t nowMs) const;
  bool cleaningEligible(const SensorSnapshot& sensors) const;
  ActuatorCommand failSafe(const SensorSnapshot& sensors) const;
};

