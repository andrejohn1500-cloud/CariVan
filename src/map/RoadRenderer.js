import { MeshBuilder, StandardMaterial, Color3, Vector3, VertexData } from '@babylonjs/core';
import { geoToWorld } from './OSMFetcher.js';

const ROAD_Y_OFFSET = 2.5;

function safeHeight(terrain, x, z) {
  if (!terrain) return 0;
  try {
    const h = terrain.getHeightAtCoordinates(x, z);
    return (h == null || isNaN(h)) ? 0 : h;
  } catch { return 0; }
}

function roadMat(scene, name, r, g, b) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(r, g, b);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  m.backFaceCulling = false;
  return m;
}

function segmentMesh(scene, name, ax, az, bx, bz, width, mat, terrain) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 0.5) return null;

  const mx = (ax + bx) / 2;
  const mz = (az + bz) / 2;
  const y = safeHeight(terrain, mx, mz);

  const road = MeshBuilder.CreateBox(name, {
    width: width,
    height: 1.8,
    depth: len
  }, scene);

  road.position.set(mx, y + ROAD_Y_OFFSET, mz);
  road.rotation.y = -Math.atan2(dx, dz);
  road.material = mat;
  road.receiveShadows = true;
  return road;
}

export function renderRoads(scene, terrain, roadData) {
  const meshes = [];
  let segCount = 0;

  // Accept passed-in road data (live OSM) or fall back to nothing
  if (!roadData || Object.keys(roadData).length === 0) {
    console.warn('RoadRenderer: no road data provided');
    return meshes;
  }

  // Cache materials per road type to avoid duplicates
  const matCache = {};
  function getMat(key, color) {
    if (!matCache[key]) {
      matCache[key] = roadMat(scene, 'roadMat_' + key, color[0], color[1], color[2]);
    }
    return matCache[key];
  }

  Object.entries(roadData).forEach(([key, road]) => {
    const mat = getMat(road.type || key, road.color);
    const pts = road.points.map(([lat, lon]) => geoToWorld(lat, lon));

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = segmentMesh(
        scene, 'road_' + key + '_' + i,
        a.x, a.z, b.x, b.z,
        road.width, mat, terrain
      );
      if (seg) { meshes.push(seg); segCount++; }
    }

    // Centre line dashes
    const lineMat = roadMat(scene, 'line_' + key, 0.95, 0.90, 0.50);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = -Math.atan2(dx, dz);
      const numDashes = Math.max(1, Math.floor(len / 260));

      for (let d = 0; d < numDashes; d++) {
        const t = (d + 0.5) / numDashes;
        const px = a.x + dx * t;
        const pz = a.z + dz * t;
        const y = safeHeight(terrain, px, pz);
        const dash = MeshBuilder.CreateBox('dash_' + key + '_' + i + '_' + d, {
          width: 18, height: 1.8, depth: 90
        }, scene);
        dash.position.set(px, y + ROAD_Y_OFFSET + 0.15, pz);
        dash.rotation.y = angle;
        dash.material = lineMat;
        meshes.push(dash);
      }
    }
  });

  console.log('✅ Roads rendered: ' + segCount + ' segments from ' + Object.keys(roadData).length + ' roads');
  return meshes;
}

export function renderJunctions(scene, terrain, roadData) {
  if (!roadData) return;
  const jMat = roadMat(scene, 'jMat', 0.15, 0.15, 0.15);

  // Build junction points from actual road endpoints
  const seen = new Set();
  Object.values(roadData).forEach(road => {
    if (!road.points || road.points.length < 2) return;
    [road.points[0], road.points[road.points.length - 1]].forEach(([lat, lon]) => {
      const key = lat.toFixed(3) + ',' + lon.toFixed(3);
      if (seen.has(key)) return;
      seen.add(key);
      const { x, z } = geoToWorld(lat, lon);
      const y = safeHeight(terrain, x, z);
      const box = MeshBuilder.CreateBox('junction_' + key, {
        width: 300, height: 1.8, depth: 300
      }, scene);
      box.position.set(x, y + ROAD_Y_OFFSET - 0.1, z);
      box.material = jMat;
    });
  });
}