export const HondaCivicFD2 = {
  id:   'fd2',
  name: 'Honda Civic Type R FD2',
  glb:  '2009_honda_civic_type_r_fd2_custom.glb',

  // Visual
  scale:    0.04,
  bodyRotX: 0,
  bodyRotY: 0,
  bodyRotZ: 0,
  suspensionHeight: 0.52,

  // Performance — K20A VTEC weapon
  topSpeedKph:     180,
  reverseSpeedKph: 30,
  engineTorque:    32,
  engineBrake:     7,
  footBrake:       48,
  handbrakeForce:  62,

  // Handling — sharp, touge-tuned
  steerMaxRad:      0.10,
  steerSpeedLow:    0.4,
  steerSpeedHigh:   0.4,
  steerReturnRate:  6.5,
  steerSpeedBlend:  90,
  rollFactor:       0.05,
  worldScale:       10,

  // Drag race (paddle shifter targets)
  gearRatios:    [3.27, 2.13, 1.52, 1.13, 0.85, 0.71],
  finalDrive:    4.76,
  redlineRpm:    8400,
  shiftPointRpm: 8000,

  // Audio
  engineSound: 'vtec',

  // Mod slots (placeholders)
  mods: {
    engine: null, suspension: null, tires: null, body: null, livery: null,
  },
};