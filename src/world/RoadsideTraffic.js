import {
  SceneLoader, TransformNode, Vector3,
  MeshBuilder, StandardMaterial, Color3, Animation
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

// Parked car positions along road — spaced realistically
// Each entry: { distFraction: 0-1, side: -1=ocean/+1=hill, file, scale }
const PARKED_VEHICLES = [
  { frac: 0.04,  side:  1,  file: 'mitsubishi_lancer_evolution_6___www.vecarz.com.glb', scale: 1.0 },
  { frac: 0.08,  side: -1,  file: '2005_toyota_corolla_luxel.glb',                      scale: 1.0 },
  { frac: 0.13,  side:  1,  file: 'honda_civic_malaysia_police_car.glb',                 scale: 1.0 },
  { frac: 0.18,  side: -1,  file: 'nissan_caravan_detailed_3d_van_model_.glb',           scale: 1.1 },
  { frac: 0.24,  side:  1,  file: '2023_toyota_rav4_hybrid.glb',                         scale: 1.0 },
  { frac: 0.30,  side: -1,  file: '2005_toyota_corolla_luxel.glb',                       scale: 1.0 },
  { frac: 0.36,  side:  1,  file: 'truck_toyota_corsa_b.glb',                            scale: 1.2 },
  { frac: 0.42,  side: -1,  file: 'honda_civic_malaysia_police_car.glb',                 scale: 1.0 },
  { frac: 0.48,  side:  1,  file: 'mitsubishi_lancer_evolution_6___www.vecarz.com.glb',  scale: 1.0 },
  { frac: 0.54,  side: -1,  file: '2023_toyota_rav4_hybrid.glb',                         scale: 1.0 },
  { frac: 0.60,  side:  1,  file: 'nissan_caravan_detailed_3d_van_model_.glb',           scale: 1.1 },
  { frac: 0.66,  side: -1,  file: '2005_toyota_corolla_luxel.glb',                       scale: 1.0 },
  { frac: 0.72,  side:  1,  file: 'truck_toyota_corsa_b.glb',                            scale: 1.2 },
  { frac: 0.78,  side: -1,  file: 'honda_civic_malaysia_police_car.glb',                 scale: 1.0 },
  { frac: 0.84,  side:  1,  file: '2005_toyota_corolla_luxel.glb',                       scale: 1.0 },
  { frac: 0.90,  side: -1,  file: 'nissan_caravan_detailed_3d_van_model_.glb',           scale: 1.1 },
  { frac: 0.95,  side:  1,  file: '2023_toyota_rav4_hybrid.glb',                         scale: 1.0 },
];

// Parked offset — just off road edge
const PARK_OFFSET = 55;

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

function _loadVehicle(scene, file, x, y, z, rotY, scale) {
  const node = new TransformNode('traffic_' + file + '_' + Math.round(x), scene);
  node.position  = new Vector3(x, y, z);
  node.rotation.y = rotY;
  node.scaling   = new Vector3(scale, scale, scale);

  SceneLoader.ImportMeshAsync('', './assets/', file, scene)
    .then(result => {
      result.meshes.forEach(m => {
        m.parent = node;
        m.receiveShadows = true;
      });
    })
    .catch(() => {
      // Fallback box car if GLB missing
      const fb = MeshBuilder.CreateBox('fbcar_' + Math.round(x), {
        width: 35, height: 22, depth: 60
      }, scene);
      fb.position = new Vector3(x, y + 11, z);
      const fm = new StandardMaterial('fbcarMat_' + Math.round(x), scene);
      fm.diffuseColor = new Color3(
        0.4 + Math.random() * 0.5,
        0.1 + Math.random() * 0.3,
        0.1 + Math.random() * 0.3
      );
      fb.material = fm;
    });

  return node;
}

export function buildRoadsideTraffic(scene, terrain, roadPoints) {
  if (!roadPoints || roadPoints.length === 0) return;

  const N = roadPoints.length;

  PARKED_VEHICLES.forEach((cfg, idx) => {
    // Find road point at this fraction of total length
    const i    = Math.floor(cfg.frac * N);
    const p    = roadPoints[Math.min(i, N - 1)];
    const perp = _perp(roadPoints, Math.min(i, N - 1));

    // Get road heading for car facing direction
    const next  = roadPoints[(i + 1) % N];
    const tang  = next.subtract(p).normalize();
    const roadHeading = Math.atan2(tang.x, tang.z);

    // Position beside road
    const offset = PARK_OFFSET * cfg.side;
    const px = p.x + perp.x * offset + (Math.random() - 0.5) * 10;
    const pz = p.z + perp.z * offset + (Math.random() - 0.5) * 10;
    const py = _groundY(terrain, px, pz);

    // Face same direction as road + slight angle variation
    const rot = roadHeading + (Math.random() - 0.5) * 0.3;

    _loadVehicle(scene, cfg.file, px, py, pz, rot, cfg.scale);
  });

  // ── Police car flashing lights near Kingstown ──────────────────────────────
  _buildPoliceScene(scene, terrain, roadPoints, N);

  console.log('Roadside traffic placed ✅');
}

function _buildPoliceScene(scene, terrain, roadPoints, N) {
  // Place near start — Kingstown area
  const i    = Math.floor(0.02 * N);
  const p    = roadPoints[Math.min(i, N - 1)];
  const perp = _perp(roadPoints, Math.min(i, N - 1));

  const px = p.x + perp.x * 50;
  const pz = p.z + perp.z * 50;
  const py = _groundY(terrain, px, pz);

  // Police car
  _loadVehicle(scene, 'honda_civic_malaysia_police_car.glb',
    px, py, pz, Math.random() * Math.PI * 2, 1.0);

  // Red flash light
  const redLight = MeshBuilder.CreateSphere('policeRed', { diameter: 5 }, scene);
  redLight.position = new Vector3(px, py + 30, pz - 5);
  const redMat = new StandardMaterial('policeRedMat', scene);
  redMat.diffuseColor  = new Color3(1, 0, 0);
  redMat.emissiveColor = new Color3(1, 0, 0);
  redLight.material = redMat;

  // Blue flash light
  const blueLight = MeshBuilder.CreateSphere('policeBlue', { diameter: 5 }, scene);
  blueLight.position = new Vector3(px, py + 30, pz + 5);
  const blueMat = new StandardMaterial('policeBlueMat', scene);
  blueMat.diffuseColor  = new Color3(0, 0.3, 1);
  blueMat.emissiveColor = new Color3(0, 0.3, 1);
  blueLight.material = blueMat;

  // Alternating flash animation
  const redFlash = new Animation('redFlash', 'material.emissiveColor.r', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  redFlash.setKeys([
    { frame:  0, value: 1.0 },
    { frame:  8, value: 0.0 },
    { frame: 16, value: 1.0 },
    { frame: 24, value: 0.0 },
    { frame: 30, value: 1.0 },
  ]);
  redLight.animations = [redFlash];
  scene.beginAnimation(redLight, 0, 30, true);

  const blueFlash = new Animation('blueFlash', 'material.emissiveColor.b', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  blueFlash.setKeys([
    { frame:  0, value: 0.0 },
    { frame:  8, value: 1.0 },
    { frame: 16, value: 0.0 },
    { frame: 24, value: 1.0 },
    { frame: 30, value: 0.0 },
  ]);
  blueLight.animations = [blueFlash];
  scene.beginAnimation(blueLight, 0, 30, true);
}