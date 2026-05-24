import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import { geoToWorld } from '../map/OSMFetcher.js';

function getY(terrain, x, z) {
  if (!terrain) return 0;
  try { return terrain.getHeightAtCoordinates(x, z) || 0; } catch(e) { return 0; }
}

function mat(scene, name, r, g, b) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor  = new Color3(r, g, b);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
}

// ── Road Sign (green background, white text panel) ─────────────────
function buildRoadSign(scene, terrain, lat, lon, label, dist, facing) {
  const wp = geoToWorld(lat, lon);
  const gy = getY(terrain, wp.x, wp.z);
  const id = label.replace(/\s+/g, '_') + '_' + Math.random().toString(36).slice(2, 5);

  // Post
  const post = MeshBuilder.CreateCylinder('sign_post_' + id, {
    diameter: 0.35, height: 10, tessellation: 6
  }, scene);
  post.position.set(wp.x, gy + 5, wp.z);
  post.material = mat(scene, 'post_m_' + id, 0.65, 0.65, 0.65);

  // Sign board (SVG-style green direction sign)
  const board = MeshBuilder.CreateBox('sign_board_' + id, {
    width: 0.3, height: 3.5, depth: 8
  }, scene);
  board.position.set(wp.x, gy + 11, wp.z);
  if (facing) board.rotation.y = facing;
  board.material = mat(scene, 'board_m_' + id, 0.06, 0.35, 0.12);

  // White arrow/text panel
  const panel = MeshBuilder.CreateBox('sign_panel_' + id, {
    width: 0.32, height: 2.8, depth: 7.2
  }, scene);
  panel.position.set(wp.x, gy + 11, wp.z);
  if (facing) panel.rotation.y = facing;
  panel.material = mat(scene, 'panel_m_' + id, 0.92, 0.92, 0.92);

  // Distance plate (yellow strip at bottom)
  if (dist) {
    const distPlate = MeshBuilder.CreateBox('dist_' + id, {
      width: 0.32, height: 0.7, depth: 3.2
    }, scene);
    distPlate.position.set(wp.x, gy + 9, wp.z);
    if (facing) distPlate.rotation.y = facing;
    distPlate.material = mat(scene, 'dist_m_' + id, 0.92, 0.82, 0.0);
  }
}

// ── Speed Limit Sign ──────────────────────────────────────────────
function buildSpeedSign(scene, terrain, lat, lon, limit) {
  const wp = geoToWorld(lat, lon);
  const gy = getY(terrain, wp.x, wp.z);
  const id = 'spd_' + lat + '_' + lon;

  const post = MeshBuilder.CreateCylinder('spost_' + id, {
    diameter: 0.28, height: 9, tessellation: 6
  }, scene);
  post.position.set(wp.x, gy + 4.5, wp.z);
  post.material = mat(scene, 'spM_' + id, 0.60, 0.60, 0.60);

  // Round sign (white circle with red border)
  const circle = MeshBuilder.CreateCylinder('sspd_' + id, {
    diameter: 3.2, height: 0.25, tessellation: 18
  }, scene);
  circle.position.set(wp.x, gy + 9.5, wp.z);
  circle.rotation.x = Math.PI / 2;
  circle.material = mat(scene, 'scM_' + id, 0.95, 0.95, 0.95);

  const border = MeshBuilder.CreateTorus('sbdr_' + id, {
    diameter: 3.2, thickness: 0.4, tessellation: 18
  }, scene);
  border.position.set(wp.x, gy + 9.5, wp.z);
  border.rotation.x = Math.PI / 2;
  border.material = mat(scene, 'sbM_' + id, 0.88, 0.08, 0.08);
}

// ── Speed Bump ────────────────────────────────────────────────────
function buildSpeedBump(scene, terrain, lat, lon, roadWidth, facing) {
  const wp = geoToWorld(lat, lon);
  const gy = getY(terrain, wp.x, wp.z);
  const id = 'bump_' + lat + '_' + lon;

  const bump = MeshBuilder.CreateBox('bump_' + id, {
    width: 0.8, height: 0.5, depth: roadWidth + 2
  }, scene);
  bump.position.set(wp.x, gy + 0.22, wp.z);
  if (facing) bump.rotation.y = facing;
  bump.material = mat(scene, 'bumpM_' + id, 0.15, 0.15, 0.15);

  // Yellow warning stripes
  for (let s = 0; s < 5; s++) {
    const stripe = MeshBuilder.CreateBox('bstripe_' + id + s, {
      width: 0.82, height: 0.52, depth: 0.8
    }, scene);
    stripe.position.set(wp.x, gy + 0.23, wp.z - 4 + s * 2);
    if (facing) stripe.rotation.y = facing;
    stripe.material = mat(scene, 'bsM_' + id + s, 0.90, 0.80, 0.0);
  }
}

// ── Named Location Marker (visible in minimap context) ────────────
function buildLocationMarker(scene, terrain, lat, lon, name) {
  // Invisible anchor used for minimap labels
  const wp = geoToWorld(lat, lon);
  return { name, x: wp.x, z: wp.z };
}

// ── MAIN EXPORT ───────────────────────────────────────────────────
export function buildSVGLocations(scene, terrain) {
  const locations = [];

  // ── Direction Signs ───────────────────────────────────────────
  // Out of Kingstown heading north (Leeward Hwy)
  buildRoadSign(scene, terrain, 13.165, -61.230, 'LAYOU / BARROUALLIE', '14 km', 0);
  buildRoadSign(scene, terrain, 13.165, -61.230, 'CHATEAUBELAIR', '32 km', 0);

  // Approaching Kingstown from Leeward
  buildRoadSign(scene, terrain, 13.172, -61.233, 'KINGSTOWN', '3 km', Math.PI);

  // Windward highway out of Kingstown
  buildRoadSign(scene, terrain, 13.150, -61.215, 'ARNOS VALE / CALLIAQUA', '4 km', 0.3);
  buildRoadSign(scene, terrain, 13.150, -61.215, 'ARGYLE AIRPORT', '9 km', 0.3);
  buildRoadSign(scene, terrain, 13.150, -61.215, 'GEORGETOWN', '27 km', 0.3);

  // Mesopotamia junction
  buildRoadSign(scene, terrain, 13.148, -61.213, 'MESOPOTAMIA', '8 km', -0.5);
  buildRoadSign(scene, terrain, 13.148, -61.213, 'ARNOS VALE', '0.5 km', Math.PI);

  // Argyle Airport turnoff
  buildRoadSign(scene, terrain, 13.157, -61.170, 'ARGYLE INT\'L AIRPORT', '1.5 km', -1.2);

  // Georgetown
  buildRoadSign(scene, terrain, 13.260, -61.122, 'GEORGETOWN', '0', 0);

  // ── Speed Limit Signs ─────────────────────────────────────────
  // Entering Kingstown
  buildSpeedSign(scene, terrain, 13.162, -61.225, 30);
  buildSpeedSign(scene, terrain, 13.155, -61.218, 30);

  // Leeward highway open road
  buildSpeedSign(scene, terrain, 13.178, -61.240, 50);

  // Layou
  buildSpeedSign(scene, terrain, 13.198, -61.258, 30);

  // Arnos Vale roundabout
  buildSpeedSign(scene, terrain, 13.149, -61.211, 30);

  // Airport road
  buildSpeedSign(scene, terrain, 13.158, -61.162, 40);

  // Georgetown
  buildSpeedSign(scene, terrain, 13.261, -61.122, 30);

  // ── Speed Bumps (near schools, churches, villages) ────────────
  // Kingstown market area
  buildSpeedBump(scene, terrain, 13.158, -61.226, 12, 0.1);

  // Layou entrance
  buildSpeedBump(scene, terrain, 13.199, -61.259, 10, 0.05);
  buildSpeedBump(scene, terrain, 13.201, -61.261, 10, 0.05);

  // Barrouallie
  buildSpeedBump(scene, terrain, 13.230, -61.272, 10, 0.08);

  // Arnos Vale school area
  buildSpeedBump(scene, terrain, 13.146, -61.210, 10, 0.15);

  // Calliaqua village
  buildSpeedBump(scene, terrain, 13.139, -61.194, 9, 0.2);

  // Georgetown school
  buildSpeedBump(scene, terrain, 13.264, -61.121, 9, 0.0);

  // ── Named Location Markers (for minimap) ─────────────────────
  const places = [
    [13.158, -61.225, 'Kingstown'],
    [13.200, -61.260, 'Layou'],
    [13.231, -61.273, 'Barrouallie'],
    [13.293, -61.252, 'Chateaubelair'],
    [13.145, -61.207, 'Arnos Vale'],
    [13.138, -61.193, 'Calliaqua'],
    [13.157, -61.149, 'Argyle Airport'],
    [13.218, -61.192, 'Mesopotamia'],
    [13.263, -61.121, 'Georgetown'],
    [13.380, -61.130, 'Fancy'],
    [13.153, -61.208, 'Villa Beach'],
    [13.175, -61.168, 'Biabou'],
  ];

  places.forEach(([lat, lon, name]) => {
    locations.push(buildLocationMarker(scene, terrain, lat, lon, name));
  });

  return locations;
}

// Named places for minimap overlay
export const SVG_PLACE_NAMES = [
  { name: 'Kingstown',        lat: 13.158, lon: -61.225 },
  { name: 'Layou',            lat: 13.200, lon: -61.260 },
  { name: 'Barrouallie',      lat: 13.231, lon: -61.273 },
  { name: 'Chateaubelair',    lat: 13.293, lon: -61.252 },
  { name: 'Arnos Vale',       lat: 13.145, lon: -61.207 },
  { name: 'Calliaqua',        lat: 13.138, lon: -61.193 },
  { name: 'Argyle Airport',   lat: 13.157, lon: -61.149 },
  { name: 'Mesopotamia',      lat: 13.218, lon: -61.192 },
  { name: 'Georgetown',       lat: 13.263, lon: -61.121 },
  { name: 'Fancy',            lat: 13.380, lon: -61.130 },
  { name: 'Villa',            lat: 13.153, lon: -61.208 },
  { name: 'Biabou',           lat: 13.175, lon: -61.168 },
];
