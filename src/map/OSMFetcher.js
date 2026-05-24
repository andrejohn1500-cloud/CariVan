import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';
import { SVG_ROADS, geoToWorld } from './OSMFetcher.js';

const ROAD_Y_OFFSET = 0.8; // sit just above terrain

function segmentMesh(scene, name, ax, az, bx, bz, width, mat, terrain) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 1) return null;

  const road = MeshBuilder.CreateBox(name, {
    width: width,
    height: 1.2,
    depth: len
  }, scene);

  const mx = (ax + bx) / 2;
  const mz = (az + bz) / 2;
  const y = terrain ? (terrain.getHeightAtCoordinates(mx, mz) || 0) : 0;

  road.position.set(mx, y + ROAD_Y_OFFSET, mz);
  road.rotation.y = -Math.atan2(dx, dz);
  road.material = mat;
  road.receiveShadows = true;
  return road;
}

function roadMat(scene, name, r, g, b) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = new Color3(r, g, b);
  m.specularColor = new Color3(0.05, 0.05, 0.05);
  return m;
}

export function renderRoads(scene, terrain) {
  const meshes = [];
  let segCount = 0;

  Object.entries(SVG_ROADS).forEach(([key, road]) => {
    const mat = roadMat(
      scene,
      'roadMat_' + key,
      road.color[0], road.color[1], road.color[2]
    );

    const pts = road.points.map(([lat, lon]) => geoToWorld(lat, lon));

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const seg = segmentMesh(
        scene,
        'road_' + key + '_' + i,
        a.x, a.z,
        b.x, b.z,
        road.width,
        mat,
        terrain
      );
      if (seg) {
        meshes.push(seg);
        segCount++;
      }
    }

    // White centre line dashes
    const lineMat = roadMat(scene, 'line_' + key, 0.92, 0.88, 0.72);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = -Math.atan2(dx, dz);
      const numDashes = Math.floor(len / 280);

      for (let d = 0; d < numDashes; d++) {
        const t = (d + 0.5) / numDashes;
        const px = a.x + dx * t;
        const pz = a.z + dz * t;
        const y = terrain ? (terrain.getHeightAtCoordinates(px, pz) || 0) : 0;

        const dash = MeshBuilder.CreateBox('dash_' + key + i + d, {
          width: 22, height: 1.3, depth: 100
        }, scene);
        dash.position.set(px, y + ROAD_Y_OFFSET + 0.1, pz);
        dash.rotation.y = angle;
        dash.material = lineMat;
        meshes.push(dash);
      }
    }
  });

  console.log('Roads rendered: ' + segCount + ' segments');
  return meshes;
}

// Road intersections — small junction boxes
export function renderJunctions(scene, terrain) {
  const junctions = [
    { lat: 13.160, lon: -61.225, name: 'Kingstown' },
    { lat: 13.145, lon: -61.212, name: 'Arnos Vale' },
    { lat: 13.190, lon: -61.258, name: 'Layou' },
    { lat: 13.230, lon: -61.272, name: 'Barrouallie' },
    { lat: 13.270, lon: -61.118, name: 'Georgetown' },
    { lat: 13.295, lon: -61.242, name: 'Chateaubelair' }
  ];

  const jMat = roadMat(scene, 'jMat', 0.15, 0.15, 0.15);

  junctions.forEach(j => {
    const { x, z } = geoToWorld(j.lat, j.lon);
    const y = terrain ? (terrain.getHeightAtCoordinates(x, z) || 0) : 0;
    const box = MeshBuilder.CreateBox('junction_' + j.name, {
      width: 350, height: 1.4, depth: 350
    }, scene);
    box.position.set(x, y + ROAD_Y_OFFSET - 0.1, z);
    box.material = jMat;
  });
}