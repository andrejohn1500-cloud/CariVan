export const COASTAL_MAX_Y = 8;

// Village anchor points only — RoadSystem finds the safe
// coastal path between these using slope + water detection
export const VILLAGE_ANCHORS = [
  { name: 'Kingstown',      x: 5278, z: -8550 },
  { name: 'ArnosVale',      x: 4600, z: -7700 },
  { name: 'Questelles',     x: 3800, z: -6700 },
  { name: 'Layou',          x: 3300, z: -6000 },
  { name: 'Barrouallie',    x: 3100, z: -5300 },
  { name: 'Keartons',       x: 3100, z: -4600 },
  { name: 'Troumaca',       x: 3300, z: -4000 },
  { name: 'Wallibou',       x: 3700, z: -3500 },
  { name: 'Chateaubelair',  x: 4200, z: -3300 },
  { name: 'Richmond',       x: 4800, z: -3300 },
  { name: 'FancyNorthTip',  x: 5100, z: -3800 },
  { name: 'Owia',           x: 5000, z: -4400 },
  { name: 'SandyBay',       x: 4900, z: -5000 },
  { name: 'Georgetown',     x: 5200, z: -5800 },
  { name: 'Biabou',         x: 5100, z: -6400 },
  { name: 'Argyle',         x: 5300, z: -7200 },
];

// Fancy roundabout circle — car drives around this, 
// ocean switches sides here
export const FANCY_ROUNDABOUT = {
  cx: 5100, cz: -3800, radius: 350, steps: 24
};

// Legacy export so RoadSystem still compiles during transition
export const ROAD_LOOP = [];