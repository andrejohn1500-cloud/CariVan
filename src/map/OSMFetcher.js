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
    name: 'Leeward Highway', width: 220, color: [0.18, 0.18, 0.18],
    points: [
      [13.160,-61.225],[13.168,-61.232],[13.175,-61.240],[13.182,-61.248],
      [13.190,-61.258],[13.200,-61.263],[13.212,-61.268],[13.230,-61.272],
      [13.248,-61.270],[13.265,-61.262],[13.280,-61.252],[13.295,-61.242],
      [13.310,-61.238],[13.322,-61.234]
    ]
  },
  windward_highway: {
    name: 'Windward Highway', width: 200, color: [0.18, 0.18, 0.18],
    points: [
      [13.160,-61.225],[13.152,-61.218],[13.145,-61.210],[13.138,-61.200],
      [13.130,-61.190],[13.122,-61.182],[13.115,-61.175],[13.108,-61.168],
      [13.100,-61.162],[13.092,-61.158],[13.085,-61.155],[13.078,-61.152],
      [13.070,-61.150],[13.062,-61.148]
    ]
  },
  villa_road: {
    name: 'Villa Road', width: 160, color: [0.20, 0.20, 0.20],
    points: [
      [13.152,-61.210],[13.155,-61.205],[13.158,-61.200],[13.160,-61.195],
      [13.163,-61.190],[13.165,-61.185],[13.167,-61.180]
    ]
  },
  mesopotamia_road: {
    name: 'Mesopotamia Valley Road', width: 180, color: [0.20, 0.20, 0.20],
    points: [
      [13.200,-61.200],[13.210,-61.195],[13.220,-61.190],[13.230,-61.185],
      [13.240,-61.182],[13.250,-61.180],[13.260,-61.178],[13.270,-61.175]
    ]
  },
  kingstown_bay_st: {
    name: 'Bay Street Kingstown', width: 140, color: [0.22, 0.22, 0.22],
    points: [
      [13.158,-61.228],[13.158,-61.224],[13.158,-61.220],[13.158,-61.216],
      [13.158,-61.212],[13.158,-61.208]
    ]
  },
  kingstown_upper: {
    name: 'Upper Kingstown', width: 130, color: [0.22, 0.22, 0.22],
    points: [
      [13.162,-61.228],[13.164,-61.224],[13.166,-61.220],[13.168,-61.216],
      [13.170,-61.212]
    ]
  },
  argyle_access: {
    name: 'Argyle Airport Access', width: 170, color: [0.18, 0.18, 0.18],
    points: [
      [13.157,-61.149],[13.158,-61.155],[13.158,-61.161],[13.158,-61.167],
      [13.158,-61.173],[13.158,-61.179]
    ]
  }
};

export async function fetchSVGRoads(onProgress) {
  if (onProgress) onProgress('Using baked SVG road network...');
  return SVG_ROADS;
}