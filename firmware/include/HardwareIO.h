#pragma once

#include "BoardConfig.h"
#include "WelOsTypes.h"

class HardwareIO {
 public:
  void begin();
  SensorSnapshot sample(uint32_t nowMs);
  void apply(const ActuatorCommand& outputs);
  void forceSafe();

 private:
  float readScaled(uint8_t pin, const AnalogScale& scale) const;
  void writeSafe(uint8_t pin, bool energized);
  float lastPvKw_ = 0;
  float lastSoiling_ = 0;
  float batterySoc_ = -1;
  uint32_t lastSampleMs_ = 0;
};
