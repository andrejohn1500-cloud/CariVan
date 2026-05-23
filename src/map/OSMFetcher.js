const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export const SVG_BOUNDS = {
  south: 12.97,
  north: 13.58,
  west: -61.50,
  east: -61.10,
  worldWidth: 29000,
  worldHeight: 45000
};

function bbox() {
  return SVG_BOUNDS.south + ',' + SVG_BOUNDS.west + ',' + SVG_BOUNDS.north + ',' + SVG_BOUNDS.east;
}

export async function fetchSVGRoads(onProgress) {
  if (onProgress) onProgress('Fetching SVG road network...');
  const query = '[out:json][timeout:60];(way["highway"="primary"](' + bbox() + ');way["highway"="secondary"](' + bbox() + ');way["highway"="tertiary"](' + bbox() + '););out body geom;';
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (!res.ok) throw new Error('OSM fetch failed: ' + res.status);
    return await res.json();
  } catch(err) {
    console.warn('OSM road fetch failed, using fallback:', err.message);
    return { elements: [] };
  }
}

export function geoToWorld(lat, lon) {
  var s = SVG_BOUNDS;
  var x = ((lon - s.west) / (s.east - s.west)) * s.worldWidth - s.worldWidth / 2;
  var z = ((lat - s.south) / (s.north - s.south)) * s.worldHeight - s.worldHeight / 2;
  return { x: x, z: z };
}