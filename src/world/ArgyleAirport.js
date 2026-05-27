import {
  MeshBuilder, StandardMaterial, Color3,
  Vector3, Animation, TransformNode, SceneLoader
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

const AIRPORT_X = 6800;
const AIRPORT_Z = -7400;
const GROUND_Y  = 12;

export function buildArgyleAirport(scene, terrain) {
  const root = new TransformNode('argyle', scene);
  root.position = new Vector3(AIRPORT_X, GROUND_Y, AIRPORT_Z);

  _buildRunway(scene, root);
  _buildTerminal(scene, root);
  _buildTower(scene, root);
  _buildParkingLot(scene, root);
  _buildGroundPlanes(scene, root);
  // _buildLandingPlane REMOVED — was flying over the road
  _buildPerimeterFence(scene, root);
  _buildWindsock(scene, root);
  _buildRunwayLights(scene, root);

  return root;
}

function _mat(name, hex, scene, spec = 0.1, emissive = null) {
  const m = new StandardMaterial(name, scene);
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  m.diffuseColor  = new Color3(r, g, b);
  m.specularColor = new Color3(spec, spec, spec);
  if (emissive) m.emissiveColor = emissive;
  return m;
}

function _box(name, w, h, d, x, y, z, mat, parent, scene) {
  const b = MeshBuilder.CreateBox(name, { width:w, height:h, depth:d }, scene);
  b.position.set(x, y, z);
  b.parent = parent;
  b.material = mat;
  return b;
}

function _loadPlaneGLB(name, file, x, y, z, rotY, scale, scene, parent) {
  const node = new TransformNode(name, scene);
  node.position.set(x, y, z);
  node.rotation.y = rotY;
  node.scaling = new Vector3(scale, scale, scale);
  node.parent = parent;

  SceneLoader.ImportMeshAsync('', './assets/', file, scene)
    .then(result => {
      result.meshes.forEach(m => {
        m.parent = node;
        m.receiveShadows = true;
      });
      console.log(name + ' loaded ✅');
    })
    .catch(err => {
      console.warn(name + ' GLB failed, using fallback');
      _buildFallbackPlane(name + '_fb', scene, node);
    });

  return node;
}

function _buildFallbackPlane(name, scene, parent) {
  const mat = new StandardMaterial(name+'_mat', scene);
  mat.diffuseColor = new Color3(0.9, 0.9, 0.88);

  const fuse = MeshBuilder.CreateCylinder(name+'_fuse', {
    height: 380, diameterTop: 35, diameterBottom: 28, tessellation: 16
  }, scene);
  fuse.rotation.x = Math.PI / 2;
  fuse.parent = parent;
  fuse.material = mat;

  [-1, 1].forEach(s => {
    const wing = MeshBuilder.CreateBox(name+'_wing'+s, {
      width: 260, height: 5, depth: 75
    }, scene);
    wing.position.set(s * 130, -3, 20);
    wing.parent = parent;
    wing.material = mat;
  });

  const tail = MeshBuilder.CreateBox(name+'_tail', {
    width: 4, height: 75, depth: 85
  }, scene);
  tail.position.set(0, 38, 170);
  tail.parent = parent;
  tail.material = mat;
}

function _buildRunway(scene, root) {
  const rw = _box('runway', 200, 1, 3000,
    0, 0.5, 0, _mat('rwMat', '#1a1a1a', scene, 0.04), root, scene);

  for (let i = -1400; i < 1400; i += 120) {
    _box('rwDash_'+i, 2.5, 1.2, 65,
      0, 0.7, i, _mat('rwDashMat', '#ffffff', scene, 0.1,
        new Color3(0.2, 0.2, 0.2)), root, scene);
  }

  [-1, 1].forEach(end => {
    for (let lane = -3; lane <= 3; lane++) {
      _box('thresh_'+end+'_'+lane, 12, 1.2, 50,
        lane * 24, 0.7, end * 1380,
        _mat('threshMat', '#ffffff', scene, 0.1), root, scene);
    }
  });

  _box('taxiway', 650, 0.8, 65,
    220, 0.4, -450,
    _mat('taxiMat', '#222222', scene, 0.03), root, scene);

  _box('taxiLine', 650, 1.0, 3,
    220, 0.9, -450,
    _mat('taxiLineMat', '#f0c800', scene, 0.1,
      new Color3(0.3, 0.25, 0)), root, scene);

  _box('apron', 750, 0.6, 450,
    280, 0.3, -650,
    _mat('apronMat', '#2a2a2a', scene, 0.03), root, scene);

  [-1380, 1380].forEach((z, idx) => {
    _box('rnum_'+idx, 30, 1.2, 45,
      0, 0.8, z,
      _mat('rnumMat', '#ffffff', scene, 0.1,
        new Color3(0.15,0.15,0.15)), root, scene);
  });
}

function _buildTerminal(scene, root) {
  _box('terminal', 650, 85, 190,
    270, 42, -780,
    _mat('termMat', '#d8cfc0', scene, 0.15), root, scene);

  _box('termRoof', 690, 9, 210,
    270, 88, -780,
    _mat('roofMat', '#8a7a60', scene, 0.08), root, scene);

  const gfb = _box('termGlass', 620, 62, 8,
    270, 36, -876,
    _mat('glassMat', '#6090a8', scene, 0.8), root, scene);
  const gm = scene.getMaterialByName('glassMat');
  if (gm) gm.alpha = 0.72;

  for (let g = 0; g < 5; g++) {
    const gx = -280 + g * 140;
    _box('gate_'+g, 85, 52, 130,
      gx, 26, -720,
      _mat('gateMat'+g, '#cfc8b8', scene, 0.1), root, scene);
    _box('jetway_'+g, 8, 13, 90,
      gx + 22, 19, -666,
      _mat('jetwayMat'+g, '#909090', scene, 0.2), root, scene);
  }

  _box('checkin', 220, 58, 110,
    580, 29, -750,
    _mat('checkinMat', '#d0c8b8', scene, 0.12), root, scene);

  for (let c = 0; c < 7; c++) {
    const cx = -280 + c * 96;
    _box('canopy_'+c, 8, 5, 65,
      cx, 58, -810,
      _mat('canopyMat', '#7a6a50', scene, 0.05), root, scene);
    _box('pillar_'+c, 7, 52, 7,
      cx, 26, -820,
      _mat('pillarMat', '#c0b8a8', scene, 0.1), root, scene);
  }

  _box('airportSign', 320, 22, 5,
    270, 95, -876,
    _mat('signMat', '#003366', scene, 0.1,
      new Color3(0, 0.18, 0.45)), root, scene);

  _box('depBoard', 180, 18, 4,
    270, 55, -877,
    _mat('depMat', '#001133', scene, 0.1,
      new Color3(0.0, 0.3, 0.8)), root, scene);
}

function _buildTower(scene, root) {
  _box('towerBase', 45, 22, 45,
    520, 11, -850,
    _mat('towerBaseMat', '#c8c0b0', scene, 0.1), root, scene);

  _box('towerShaft', 30, 240, 30,
    520, 142, -850,
    _mat('towerShaftMat', '#d0c8b8', scene, 0.12), root, scene);

  _box('towerCab', 58, 38, 58,
    520, 280, -850,
    _mat('towerCabMat', '#5888a0', scene, 0.9,
      new Color3(0.04, 0.14, 0.22)), root, scene);
  const cabMat = scene.getMaterialByName('towerCabMat');
  if (cabMat) cabMat.alpha = 0.72;

  _box('towerRoof', 65, 9, 65,
    520, 302, -850,
    _mat('towerRoofMat', '#404040', scene, 0.05), root, scene);

  const ant = MeshBuilder.CreateCylinder('antenna', {
    height: 65, diameter: 3, tessellation: 8
  }, scene);
  ant.position.set(520, 338, -850);
  ant.parent = root;
  ant.material = _mat('antMat', '#c0c0c0', scene, 0.5);

  const beacon = MeshBuilder.CreateSphere('beacon', { diameter: 9 }, scene);
  beacon.position.set(520, 372, -850);
  beacon.parent = root;
  beacon.material = _mat('beaconMat', '#ff2200', scene, 0.1,
    new Color3(1, 0.1, 0));

  const flash = new Animation('beaconFlash', 'material.emissiveColor.r', 60,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  flash.setKeys([
    { frame:  0, value: 1.0 },
    { frame: 15, value: 0.0 },
    { frame: 30, value: 1.0 },
    { frame: 60, value: 1.0 },
  ]);
  beacon.animations = [flash];
  scene.beginAnimation(beacon, 0, 60, true);

  const strobe = MeshBuilder.CreateSphere('strobe', { diameter: 6 }, scene);
  strobe.position.set(520, 365, -850);
  strobe.parent = root;
  strobe.material = _mat('strobeMat', '#ffffff', scene, 0.1,
    new Color3(1, 1, 1));
  const sf = new Animation('strobeFlash', 'material.emissiveColor.r', 60,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  sf.setKeys([
    { frame:  0, value: 0.0 },
    { frame:  3, value: 1.0 },
    { frame:  6, value: 0.0 },
    { frame: 60, value: 0.0 },
  ]);
  strobe.animations = [sf];
  scene.beginAnimation(strobe, 0, 60, true);
}

function _buildParkingLot(scene, root) {
  _box('parking', 550, 0.5, 300,
    -220, 0.3, -840,
    _mat('lotMat', '#282828', scene, 0.03), root, scene);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 10; col++) {
      _box('bay_'+row+'_'+col, 2, 1, 52,
        -440 + col * 48, 1, -720 + row * 85,
        _mat('bayMat', '#e0e0e0', scene, 0.1), root, scene);
    }
  }

  const lotCars = [
    { x: -420, z: -730, file: '2005_toyota_corolla_luxel.glb',        scale: 0.9 },
    { x: -370, z: -730, file: '2023_toyota_rav4_hybrid.glb',           scale: 0.9 },
    { x: -320, z: -730, file: 'mitsubishi_lancer_evolution_6__www.vecarz.com.glb',
    { x: -270, z: -730, file: '2005_toyota_corolla_luxel.glb',         scale: 0.9 },
    { x: -420, z: -810, file: 'honda_civic_malaysia_police_car.glb',   scale: 0.9 },
    { x: -370, z: -810, file: '2023_toyota_rav4_hybrid.glb',           scale: 0.9 },
    { x: -320, z: -810, file: 'nissan_caravan_detailed_3d_van_model_.glb', scale: 1.0 },
    { x: -270, z: -810, file: 'truck_toyota_corsa_b.glb',              scale: 1.0 },
  ];

  lotCars.forEach((cfg, i) => {
    const node = new TransformNode('lotCar_'+i, scene);
    node.position.set(cfg.x, 1, cfg.z);
    node.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 0.15;
    node.scaling = new Vector3(cfg.scale, cfg.scale, cfg.scale);
    node.parent = root;
    SceneLoader.ImportMeshAsync('', './assets/', cfg.file, scene)
      .then(r => r.meshes.forEach(m => { m.parent = node; m.receiveShadows = true; }))
      .catch(() => {});
  });

  for (let l = 0; l < 5; l++) {
    const lx = -420 + l * 110;
    const pole = MeshBuilder.CreateCylinder('lotPole_'+l, {
      height: 90, diameter: 4, tessellation: 8
    }, scene);
    pole.position.set(lx, 45, -700);
    pole.parent = root;
    pole.material = _mat('poleMat', '#808080', scene, 0.3);

    _box('lotLight_'+l, 22, 7, 22,
      lx, 92, -700,
      _mat('lightMat'+l, '#fffde0', scene, 0.1,
        new Color3(0.7, 0.7, 0.35)), root, scene);
  }

  _box('lotEntrance', 65, 0.5, 130,
    -470, 0.4, -678,
    _mat('entranceMat', '#1a1a1a', scene, 0.02), root, scene);
}

// ── Ground Planes — scale fixed, stays within airport boundary ────────────────
function _buildGroundPlanes(scene, root) {
  // Scale 0.004 keeps planes at realistic size within airport perimeter
  _loadPlaneGLB(
    'plane_gate_1',
    'boeing_787-9_singapore_airlines.glb',
    -60, 1, -520,
    0, 0.004,
    scene, root
  );

  _loadPlaneGLB(
    'plane_gate_2',
    'boeing_e-767_-_.free (1).glb',
    80, 1, -540,
    0.08, 0.004,
    scene, root
  );

  _loadPlaneGLB(
    'plane_taxi',
    'boeing_787-9_singapore_airlines.glb',
    180, 1, -400,
    -0.4, 0.004,
    scene, root
  );
}

function _buildRunwayLights(scene, root) {
  for (let z = -1380; z <= 1380; z += 120) {
    [-105, 105].forEach(x => {
      const light = MeshBuilder.CreateSphere('rwLight_'+x+'_'+z, {
        diameter: 4
      }, scene);
      light.position.set(x, 2, z);
      light.parent = root;
      light.material = _mat('rwLightMat_'+x+'_'+z,
        '#ffffaa', scene, 0.1, new Color3(0.8, 0.8, 0.3));
    });
  }

  [-1, 1].forEach(end => {
    for (let x = -90; x <= 90; x += 22) {
      const tl = MeshBuilder.CreateSphere('thLight_'+end+'_'+x, {
        diameter: 5
      }, scene);
      tl.position.set(x, 2, end * 1390);
      tl.parent = root;
      tl.material = _mat('thLightMat_'+end+'_'+x,
        '#ff3300', scene, 0.1, new Color3(0.9, 0.1, 0));
    }
  });

  for (let p = 0; p < 4; p++) {
    _box('papi_'+p, 8, 5, 8,
      -140, 3, -600 + p * 18,
      _mat('papiMat_'+p, p < 2 ? '#ff2200' : '#ffffff', scene, 0.1,
        p < 2
          ? new Color3(0.9, 0.05, 0)
          : new Color3(0.9, 0.9, 0.9)),
      root, scene);
  }
}

function _buildPerimeterFence(scene, root) {
  [
    { x: -520, z: -1450, w: 1100, d: 4  },
    { x: -520, z:   850, w: 1100, d: 4  },
    { x:-1066, z:  -300, w: 4,    d: 2300 },
    { x:  546, z:  -300, w: 4,    d: 2300 },
  ].forEach((s, i) => {
    _box('fence_'+i, s.w, 20, s.d,
      s.x, 10, s.z,
      _mat('fenceMat', '#808878', scene, 0.05), root, scene);
  });
}

function _buildWindsock(scene, root) {
  const pole = MeshBuilder.CreateCylinder('wsPole', {
    height: 130, diameter: 4, tessellation: 8
  }, scene);
  pole.position.set(-160, 65, -1340);
  pole.parent = root;
  pole.material = _mat('wsPoleMat', '#c0c0c0', scene, 0.4);

  const sock = MeshBuilder.CreateCylinder('wsSock', {
    height: 55, diameterTop: 9,
    diameterBottom: 24, tessellation: 12
  }, scene);
  sock.position.set(-160, 135, -1340);
  sock.rotation.z = Math.PI / 4;
  sock.parent = root;
  sock.material = _mat('wsSockMat', '#ff6600', scene, 0.1,
    new Color3(0.25, 0.08, 0));

  const sway = new Animation('wsSway', 'rotation.z', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  sway.setKeys([
    { frame:   0, value: Math.PI/4       },
    { frame:  45, value: Math.PI/4 + 0.3 },
    { frame:  90, value: Math.PI/4 - 0.1 },
    { frame: 135, value: Math.PI/4       },
  ]);
  sock.animations = [sway];
  scene.beginAnimation(sock, 0, 135, true);
}