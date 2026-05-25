import {
  SceneLoader, TransformNode, Vector3,
  MeshBuilder, StandardMaterial, Color3
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { ROAD_LOOP } from '../road/RoadNetwork.js';

// How far off road edge to place scenery
const SEA_SIDE_OFFSET  = -80;   // west / ocean side
const HILL_SIDE_OFFSET =  90;   // east / mountain side

// Plant every N road points
const PALM_INTERVAL    = 8;
const BANANA_INTERVAL  = 12;
const FLOWER_INTERVAL  = 6;

function _groundY(terrain, x, z) {
  try {
    const h = terrain?.getHeightAtCoordinates?.(x, z);
    return (h == null || isNaN(h)) ? 0 : Math.min(h, 50);
  } catch { return 0; }
}

function _perp(points, i) {
  const N    = points.length;
  const next = points[(i + 1) % N];
  const prev = points[(i - 1 + N) % N];
  const tang = next.subtract(prev).normalize();
  return new Vector3(tang.z, 0, -tang.x);
}

// Place a GLB at world position with random Y rotation + scale variation
function _placeGLB(scene, file, x, y, z, baseScale, scaleVariance) {
  const node = new TransformNode('scn_' + file + '_' + x + '_' + z, scene);
  node.position = new Vector3(x, y, z);
  node.rotation.y = Math.random() * Math.PI * 2;
  const s = baseScale + (Math.random() - 0.5) * scaleVariance;
  node.scaling = new Vector3(s, s, s);

  SceneLoader.ImportMeshAsync('', './assets/', file, scene)
    .then(result => {
      result.meshes.forEach(m => {
        m.parent = node;
        m.receiveShadows = true;
      });
    })
    .catch(() => {
      // Fallback cylinder if GLB missing
      const fb = MeshBuilder.CreateCylinder('fb_' + x + '_' + z, {
        height: 12, diameter: 3, tessellation: 6
      }, scene);
      fb.position = new Vector3(x, y + 6, z);
      const fm = new StandardMaterial('fbMat', scene);
      fm.diffuseColor = new Color3(0.2, 0.55, 0.15);
      fb.material = fm;
    });

  return node;
}

export function buildRoadsideScenery(scene, terrain, roadPoints) {
  if (!roadPoints || roadPoints.length === 0) return;

  const N = roadPoints.length;

  roadPoints.forEach((p, i) => {
    const perp = _perp(roadPoints, i);

    // ── Coconut palms — both sides, staggered ──────────────────────────────
    if (i % PALM_INTERVAL === 0) {
      // Ocean side palm
      const ox1  = p.x + perp.x * (SEA_SIDE_OFFSET + Math.random() * 30);
      const oz1  = p.z + perp.z * (SEA_SIDE_OFFSET + Math.random() * 30);
      const oy1  = _groundY(terrain, ox1, oz1);
      _placeGLB(scene, 'coconut_palm.glb', ox1, oy1, oz1, 1.0, 0.4);

      // Hill side palm — offset half interval so not mirrored
      if (i % (PALM_INTERVAL * 2) === 0) {
        const ox2 = p.x + perp.x * (HILL_SIDE_OFFSET + Math.random() * 40);
        const oz2 = p.z + perp.z * (HILL_SIDE_OFFSET + Math.random() * 40);
        const oy2 = _groundY(terrain, ox2, oz2);
        _placeGLB(scene, 'coconut_palm.glb', ox2, oy2, oz2, 1.2, 0.5);
      }
    }

    // ── Banana plants — hill side clusters ────────────────────────────────
    if (i % BANANA_INTERVAL === 0) {
      // Cluster of 2–3 banana plants together
      const clusterSize = 2 + Math.floor(Math.random() * 2);
      for (let c = 0; c < clusterSize; c++) {
        const spread = c * 15 + Math.random() * 20;
        const bx = p.x + perp.x * (HILL_SIDE_OFFSET + spread)
                       + (Math.random() - 0.5) * 25;
        const bz = p.z + perp.z * (HILL_SIDE_OFFSET + spread)
                       + (Math.random() - 0.5) * 25;
        const by = _groundY(terrain, bx, bz);
        _placeGLB(scene, 'banana_plant.glb', bx, by, bz, 0.9, 0.3);
      }
    }

    // ── Garden flowers / low vegetation — both verges ──────────────────────
    if (i % FLOWER_INTERVAL === 0) {
      // Ocean verge
      const fx1 = p.x + perp.x * (SEA_SIDE_OFFSET * 0.5 + Math.random() * 15);
      const fz1 = p.z + perp.z * (SEA_SIDE_OFFSET * 0.5 + Math.random() * 15);
      const fy1 = _groundY(terrain, fx1, fz1);
      _placeGLB(scene, 'garden_flower_-_vegetation.glb',
        fx1, fy1, fz1, 0.6, 0.2);

      // Hill verge
      const fx2 = p.x + perp.x * (HILL_SIDE_OFFSET * 0.55 + Math.random() * 18);
      const fz2 = p.z + perp.z * (HILL_SIDE_OFFSET * 0.55 + Math.random() * 18);
      const fy2 = _groundY(terrain, fx2, fz2);
      _placeGLB(scene, 'garden_flower_-_vegetation.glb',
        fx2, fy2, fz2, 0.7, 0.25);
    }
  });

  console.log('Roadside scenery planted ✅');
}