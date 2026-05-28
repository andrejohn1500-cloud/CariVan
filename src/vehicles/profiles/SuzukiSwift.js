export const SuzukiSwift = {
  id:   'swift',
  name: 'Suzuki Swift',
  glb:  'suzuki_swift.glb',

  // Visual
  scale:    1,
  bodyRotX: Math.PI,
  bodyRotY: Math.PI,
  bodyRotZ: 0,
  suspensionHeight: 0.52,

  // Performance
  topSpeedKph:     95,
  reverseSpeedKph: 25,
  engineTorque:    18,
  engineBrake:     6,
  footBrake:       38,
  handbrakeForce:  55,

  // Handling
  steerMaxRad:      0.08,
  steerSpeedLow:    0.3,
  steerSpeedHigh:   0.3,
  steerReturnRate:  5.5,
  steerSpeedBlend:  80,
  rollFactor:       0.04,
  worldScale:       10,

  // Drag race (placeholder — used later)
  gearRatios:    [3.27, 1.86, 1.30, 0.97, 0.79],
  finalDrive:    4.31,
  redlineRpm:    6500,
  shiftPointRpm: 6000,

  // Audio
  engineSound: 'car',

  // Mod slots (placeholders)
  mods: {
    engine: null, suspension: null, tires: null, body: null, livery: null,
  },
};