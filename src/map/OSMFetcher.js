// OSMFetcher.js
// Fetches real SVG road data from OpenStreetMap Overpass API.
// Falls back to baked data if network fails.

export const SVG_BOUNDS = {
  south: 12.97, north: 13.58,
  west: -61.50, east: -61.10,
  worldWidth:  29000,
  worldHeight: 45000
};

export function geoToWorld(lat, lon) {
  const s = SVG_BOUNDS;
  const x = ((lon - s.west)  / (s.east  - s.west))  * s.worldWidth  - s.worldWidth  / 2;
  const z = ((lat - s.south) / (s.north - s.south)) * s.worldHeight - s.worldHeight / 2;
  return { x, z };
}

const ROAD_WIDTH = {
  motorway: 22, trunk: 20, primary: 18, secondary: 14,
  tertiary: 11, unclassified: 9, residential: 9,
  living_street: 7, service: 7, track: 6, path: 5,
  footway: 4, default: 8,
};

const ROAD_COLOR = {
  motorway: [0.12, 0.12, 0.25], trunk: [0.14, 0.14, 0.14],
  primary: [0.18, 0.18, 0.18], secondary: [0.20, 0.20, 0.20],
  default: [0.22, 0.22, 0.22],
};

function roadWidth(type) { return ROAD_WIDTH[type] || ROAD_WIDTH.default; }
function roadColor(type) { return ROAD_COLOR[type] || ROAD_COLOR.default; }

let _cachedRoads = null;

export async function fetchSVGRoads(onProgress) {
  if (_cachedRoads) return _cachedRoads;
  if (onProgress) onProgress('Fetching OSM road data for St. Vincent...');
  try {
    const roads = await _fetchFromOverpass(onProgress);
    _cachedRoads = roads;
    return roads;
  } catch (err) {
    console.warn('OSMFetcher: Overpass failed, using baked roads:', err.message);
    if (onProgress) onProgress('Using cached road network...');
    _cachedRoads = SVG_ROADS;
    return SVG_ROADS;
  }
}

async function _fetchFromOverpass(onProgress) {
  const { south, north, west, east } = SVG_BOUNDS;
  const query = `[out:json][timeout:30];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|track)$"](${south},${west},${north},${east}););out body;>;out skel qt;`;
  const url = 'https://overpass-api.de/api/interpreter';
  const resp = await fetch(url, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(query),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!resp.ok) throw new Error('Overpass HTTP ' + resp.status);
  if (onProgress) onProgress('Parsing road geometry...');
  const json = await resp.json();
  return _parseOverpassResponse(json);
}

function _parseOverpassResponse(json) {
  const nodes = {};
  json.elements.forEach(el => {
    if (el.type === 'node') nodes[el.id] = { lat: el.lat, lon: el.lon };
  });
  const roads = {};
  json.elements.forEach(el => {
    if (el.type !== 'way') return;
    if (!el.tags || !el.tags.highway) return;
    if (!el.nodes || el.nodes.length < 2) return;
    const type = el.tags.highway;
    const key = 'osm_' + el.id;
    const points = el.nodes.map(nid => nodes[nid]).filter(Boolean).map(n => [n.lat, n.lon]);
    if (points.length < 2) return;
    roads[key] = {
      id: el.id,
      name: el.tags.name || type + '_' + el.id,
      type, width: roadWidth(type), color: roadColor(type), points,
    };
  });
  return roads;
}

export const SVG_ROADS = {
  leeward_highway: {
    name: 'Leeward Highway', type: 'primary', width: 18, color: [0.18, 0.18, 0.18],
    points: [
      [13.1591,-61.2271],[13.1613,-61.2312],[13.1648,-61.2358],[13.1678,-61.2398],
      [13.1712,-61.2442],[13.1768,-61.2489],[13.1832,-61.2521],[13.1912,-61.2548],
      [13.2012,-61.2571],[13.2105,-61.2581],[13.2198,-61.2564],[13.2312,-61.2538],
      [13.2428,-61.2502],[13.2554,-61.2468],[13.2678,-61.2432],[13.2801,-61.2398],
      [13.2921,-61.2368],[13.3048,-61.2345],[13.3178,-61.2332],[13.3312,-61.2328],
    ]
  },
  windward_highway: {
    name: 'Windward Highway', type: 'primary', width: 18, color: [0.18, 0.18, 0.18],
    points: [
      [13.1591,-61.2271],[13.1548,-61.2218],[13.1498,-61.2158],[13.1441,-61.2092],
      [13.1378,-61.2018],[13.1308,-61.1948],[13.1228,-61.1878],[13.1148,-61.1808],
      [13.1068,-61.1742],[13.0985,-61.1682],[13.0895,-61.1628],[13.0808,-61.1578],
      [13.0718,-61.1538],[13.0628,-61.1498],[13.0538,-61.1462],[13.0448,-61.1428],
      [13.0358,-61.1398],[13.0268,-61.1368],[13.0178,-61.1342],[13.0088,-61.1318],
    ]
  },
  villa_road: {
    name: 'Villa Road', type: 'secondary', width: 14, color: [0.20, 0.20, 0.20],
    points: [
      [13.1521,-61.2101],[13.1535,-61.2058],[13.1552,-61.2008],[13.1568,-61.1958],
      [13.1578,-61.1908],[13.1582,-61.1858],[13.1578,-61.1808],[13.1568,-61.1762],
    ]
  },
  bay_st_kingstown: {
    name: 'Bay Street, Kingstown', type: 'primary', width: 18, color: [0.18, 0.18, 0.18],
    points: [
      [13.1591,-61.2271],[13.1591,-61.2248],[13.1591,-61.2228],[13.1591,-61.2208],
      [13.1591,-61.2188],[13.1591,-61.2168],[13.1591,-61.2148],[13.1591,-61.2128],
    ]
  },
  upper_kingstown: {
    name: 'Upper Kingstown', type: 'secondary', width: 14, color: [0.20, 0.20, 0.20],
    points: [
      [13.1621,-61.2271],[13.1635,-61.2238],[13.1648,-61.2208],[13.1658,-61.2178],
      [13.1668,-61.2148],[13.1678,-61.2118],[13.1688,-61.2088],
    ]
  },
  mesopotamia_road: {
    name: 'Mesopotamia Valley Road', type: 'secondary', width: 14, color: [0.20, 0.20, 0.20],
    points: [
      [13.1998,-61.2008],[13.2088,-61.1958],[13.2178,-61.1908],[13.2258,-61.1858],
      [13.2338,-61.1818],[13.2418,-61.1778],[13.2498,-61.1748],[13.2578,-61.1718],
      [13.2658,-61.1688],[13.2738,-61.1662],
    ]
  },
  argyle_access: {
    name: 'Argyle Airport Access Road', type: 'secondary', width: 14, color: [0.18, 0.18, 0.18],
    points: [
      [13.1578,-61.1598],[13.1578,-61.1548],[13.1578,-61.1498],
    ]
  },
  carib_quarter_rd: {
    name: 'Carib Quarter Road', type: 'tertiary', width: 11, color: [0.20, 0.20, 0.20],
    points: [
      [13.1738,-61.2398],[13.1758,-61.2368],[13.1778,-61.2338],[13.1798,-61.2308],
      [13.1818,-61.2278],[13.1838,-61.2248],
    ]
  },
  arnos_vale_rd: {
    name: 'Arnos Vale Road', type: 'secondary', width: 14, color: [0.20, 0.20, 0.20],
    points: [
      [13.1418,-61.2188],[13.1438,-61.2148],[13.1458,-61.2108],[13.1478,-61.2068],
      [13.1498,-61.2028],[13.1518,-61.1988],[13.1538,-61.1948],[13.1558,-61.1908],
    ]
  },
  calliaqua_rd: {
    name: 'Calliaqua Road', type: 'secondary', width: 14, color: [0.20, 0.20, 0.20],
    points: [
      [13.1348,-61.2068],[13.1328,-61.2038],[13.1308,-61.2008],[13.1288,-61.1978],
      [13.1268,-61.1948],[13.1248,-61.1918],[13.1228,-61.1888],[13.1208,-61.1858],
    ]
  },
};
