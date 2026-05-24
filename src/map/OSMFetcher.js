export const SVG_BOUNDS = {
  south: 12.97, north: 13.58,
  west: -61.50,  east: -61.10,
  worldWidth: 29000, worldHeight: 45000
};

export function geoToWorld(lat, lon) {
  const s = SVG_BOUNDS;
  const x = ((lon - s.west)  / (s.east  - s.west))  * s.worldWidth  - s.worldWidth  / 2;
  const z = ((lat - s.south) / (s.north - s.south)) * s.worldHeight - s.worldHeight / 2;
  return { x, z };
}

export const SVG_ROADS = {

  leeward_highway: {
    name: 'Leeward Highway',
    width: 220,
    color: [0.18, 0.18, 0.18],
    points: [
      [13.160, -61.225],[13.168, -61.232],[13.175, -61.240],
      [13.182, -61.248],[13.190, -61.258],[13.200, -61.263],
      [13.212, -61.268],[13.230, -61.272],[13.248, -61.270],
      [13.265, -61.262],[13.280, -61.252],[13.295, -61.242],
      [13.310, -61.238],[13.322, -61.234]
    ]
  },

  windward_highway: {
    name: 'Windward Highway',
    width: 200,
    color: [0.18, 0.18, 0.18],
    points: [
      [13.160, -61.225],[13.152, -61.218],[13.145, -61.212],
      [13.138, -61.205],[13.132, -61.198],[13.128, -61.188],
      [13.138, -61.175],[13.152, -61.162],[13.175, -61.148],
      [13.205, -61.135],[13.270, -61.118],[13.300, -61.108],
      [13.332, -61.102],[13.360, -61.100],[13.380, -61.108]
    ]
  },

  kingstown_bypass: {
    name: 'Kingstown Bypass',
    width: 180,
    color: [0.20, 0.20, 0.20],
    points: [
      [13.160, -61.225],[13.162, -61.222],[13.165, -61.218],
      [13.168, -61.215],[13.172, -61.210]
    ]
  },

  mesopotamia_road: {
    name: 'Mesopotamia Valley Road',
    width: 150,
    color: [0.22, 0.20, 0.18],
    points: [
      [13.145, -61.212],[13.152, -61.205],[13.162, -61.195],
      [13.175, -61.185],[13.188, -61.175],[13.200, -61.165],
      [13.215, -61.152],[13.240, -61.142]
    ]
  },

  cross_country: {
    name: 'Cross Country Road',
    width: 130,
    color: [0.22, 0.20, 0.18],
    points: [
      [13.190, -61.258],[13.192, -61.248],[13.195, -61.238],
      [13.198, -61.225],[13.200, -61.215],[13.205, -61.200],
      [13.210, -61.188]
    ]
  },

  villa_road: {
    name: 'Villa Road',
    width: 140,
    color: [0.20, 0.18, 0.18],
    points: [
      [13.148, -61.215],[13.144, -61.210],[13.140, -61.205],
      [13.136, -61.200],[13.132, -61.195]
    ]
  },

  airport_road: {
    name: 'Airport Road',
    width: 200,
    color: [0.16, 0.16, 0.16],
    points: [
      [13.145, -61.212],[13.142, -61.218],[13.140, -61.225],
      [13.138, -61.232]
    ]
  },

  kingstown_main: {
    name: 'Kingstown Main Street',
    width: 120,
    color: [0.16, 0.16, 0.18],
    points: [
      [13.158, -61.228],[13.159, -61.225],[13.160, -61.222],
      [13.161, -61.219],[13.162, -61.216]
    ]
  },

  argyle_access: {
    name: 'Argyle Airport Access Road',
    width: 180,
    color: [0.16, 0.16, 0.16],
    points: [
      [13.152, -61.162],[13.155, -61.155],[13.157, -61.150],
      [13.158, -61.145],[13.157, -61.140]
    ]
  }
};

export async function fetchSVGRoads(onProgress) {
  if (onProgress) onProgress('Loading SVG road network...');
  return SVG_ROADS;
}