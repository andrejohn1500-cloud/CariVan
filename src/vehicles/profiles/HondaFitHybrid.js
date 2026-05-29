export const HondaFitHybrid = {
  id:   'fit',
  name: 'Honda Fit Hybrid',
  glb:  '2020_honda_fit_hybrid_6aa-gr3.glb',

  // Visual
  scale:    50,
  bodyRotX: 0,
  bodyRotY: Math.PI,
  bodyRotZ: 0,
  suspensionHeight: 0.52,

  // Performance — economy hybrid
  topSpeedKph:     150,
  reverseSpeedKph: 28,
  engineTorque:    22,
  engineBrake:     6.5,
  footBrake:       42,
  handbrakeForce:  58,

  // Handling — softer, daily-driver feel
  steerMaxRad:      0.085,
  steerSpeedLow:    0.32,
  steerSpeedHigh:   0.32,
  steerReturnRate:  5.8,
  steerSpeedBlend:  85,
  rollFactor:       0.045,
  worldScale:       10,

  // Drag race (CVT — fewer ratios)
  gearRatios:    [2.65, 1.83, 1.30, 0.93, 0.71],
  finalDrive:    4.40,
  redlineRpm:    6800,
  shiftPointRpm: 6400,

  // Audio
  engineSound: 'hybrid',

  // Mod slots
  mods: {
    engine: null, suspension: null, tires: null, body: null, livery: null,
  },
};