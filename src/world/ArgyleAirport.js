import {
  Vector3, Animation, TransformNode, SceneLoader,
  MeshBuilder, StandardMaterial, Color3
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

const AIRPORT_X = 6800;
const AIRPORT_Z = -7400;
const GROUND_Y  = 12;

export function buildArgyleAirport(scene, terrain) {
  const root = new TransformNode('argyle', scene);
  root.position = new Vector3(AIRPORT_X, GROUND_Y, AIRPORT_Z);

  _buildRunway(scene, root);
  _buildRunwayLights(scene, root);
  _loadAirportTerminal(scene, root);
  _loadControlTower(scene, root);
  _loadGroundPlanes(scene, root);
  _buildWindsock(scene, root);

  return root;
}

// ── Real GLB airport terminal ─────────────────────────────────────────────────
function _loadAirportTerminal(scene, root) {
  const node = new TransformNode('airportTerminal', scene);
  node.position.set(200, 0, -700);
  node.rotation.y = 0;
  node.scaling = new Vector3(8, 8, 8);
  node.parent = root;

  SceneLoader.ImportMeshAsync('', './assets/', 'low_poly_airport.glb', scene)
    .then(result => {
      result.meshes.forEach(m => {
        m.parent = node;
        m.receiveShadows = true;
      });
      console.log('Airport terminal loaded ✅');
    })
    .catch(err => {
      console.warn('Airport terminal failed:', err.message);
    });
}

// ── Real GLB control tower ─────────────────────────────────────────────────────
function _loadControlTower(scene, root) {
  const node = new TransformNode('controlTower', scene);
  node.position.set(520, 0, -850);
  node.rotation.y = 0;
  node.scaling = new Vector3(5, 5, 5);
  node.parent = root;

  SceneLoader.ImportMeshAsync('', './assets/', 'air_traffic_control_tower.glb', scene)
    .then(result => {
      result.meshes.forEach(m => {
        m.parent = node;
        m.receiveShadows = true;
      });
      console.log('Control tower loaded ✅');
    })
    .catch(err => {
      console.warn('Control tower failed:', err.message);
    });

  // Flashing beacon on top — stays procedural
  const beacon = MeshBuilder.CreateSphere('beacon', { diameter: 9 }, scene);
  beacon.position.set(520, 320, -850);
  beacon.parent = root;
  const beaconMat = new StandardMaterial('beaconMat', scene);
  beaconMat.diffuseColor  = new Color3(1, 0.1, 0);
  beaconMat.emissiveColor = new Color3(1, 0.1, 0);
  beacon.material = beaconMat;

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
}

// ── Boeing planes parked at gates ─────────────────────────────────────────────
function _loadGroundPlanes(scene, root) {
  const planes = [
    { name: 'plane1', file: 'boeing_787-9_singapore_airlines.glb',
      x: -60, y: 1, z: -520, ry: 0,    scale: 0.004 },
    { name: 'plane2', file: 'boeing_e-767_-_.free (1).glb',
      x:  80, y: 1, z: -540, ry: 0.08, scale: 0.004 },
  ];

  planes.forEach(cfg => {
    const node = new TransformNode(cfg.name, scene);
    node.position.set(cfg.x, cfg.y, cfg.z);
    node.rotation.y = cfg.ry;
    node.scaling = new Vector3(cfg.scale, cfg.scale, cfg.scale);
    node.parent = root;

    SceneLoader.ImportMeshAsync('', './assets/', cfg.file, scene)
      .then(result => {
        result.meshes.forEach(m => {
          m.parent = node;
          m.receiveShadows = true;
        });
        console.log(cfg.name + ' loaded ✅');
      })
      .catch(() => {
        console.warn(cfg.name + ' GLB not found');
      });
  });
}

// ── Runway — Argyle layout ────────────────────────────────────────────────────
function _buildRunway(scene, root) {
  const _mat = (name, hex, spec = 0.04, emissive = null) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor  = new Color3(
      parseInt(hex.slice(1,3),16)/255,
      parseInt(hex.slice(3,5),16)/255,
      parseInt(hex.slice(5,7),16)/255
    );
    m.specularColor = new Color3(spec, spec, spec);
    if (emissive) m.emissiveColor = emissive;
    return m;
  };
  const _box = (name, w, h, d, x, y, z, mat) => {
    const b = MeshBuilder.CreateBox(name, { width:w, height:h, depth:d }, scene);
    b.position.set(x, y, z);
    b.parent = root;
    b.material = mat;
    return b;
  };

  // Runway surface
  _box('runway', 200, 1, 3000,
    0, 0.5, 0, _mat('rwMat', '#1a1a1a'));

  // Centre dashes
  for (let i = -1400; i < 1400; i += 120) {
    _box('rwDash_'+i, 2.5, 1.2, 65,
      0, 0.7, i, _mat('rwDash_mat_'+i, '#ffffff', 0.1,
        new Color3(0.2, 0.2, 0.2)));
  }

  // Threshold markings
  [-1, 1].forEach(end => {
    for (let lane = -3; lane <= 3; lane++) {
      _box('thresh_'+end+'_'+lane, 12, 1.2, 50,
        lane * 24, 0.7, end * 1380,
        _mat('threshMat_'+end+lane, '#ffffff', 0.1));
    }
  });

  // Taxiway
  _box('taxiway', 650, 0.8, 65,
    220, 0.4, -450, _mat('taxiMat', '#222222', 0.03));

  // Yellow taxiway line
  _box('taxiLine', 650, 1.0, 3,
    220, 0.9, -450, _mat('taxiLineMat', '#f0c800', 0.1,
      new Color3(0.3, 0.25, 0)));

  // Apron
  _box('apron', 750, 0.6, 450,
    280, 0.3, -650, _mat('apronMat', '#2a2a2a', 0.03));

  // Perimeter fence
  [
    { x: -520, z: -1450, w: 1100, d: 4  },
    { x: -520, z:   850, w: 1100, d: 4  },
    { x:-1066, z:  -300, w: 4, d: 2300  },
    { x:  546, z:  -300, w: 4, d: 2300  },
  ].forEach((s, i) => {
    const fm = new StandardMaterial('fenceMat'+i, scene);
    fm.diffuseColor = new Color3(0.50, 0.53, 0.47);
    _box('fence_'+i, s.w, 20, s.d, s.x, 10, s.z, fm);
  });
}

// ── Runway lights ─────────────────────────────────────────────────────────────
function _buildRunwayLights(scene, root) {
  for (let z = -1380; z <= 1380; z += 120) {
    [-105, 105].forEach(x => {
      const light = MeshBuilder.CreateSphere('rwL_'+x+'_'+z,
        { diameter: 4 }, scene);
      light.position.set(x, 2, z);
      light.parent = root;
      const lm = new StandardMaterial('rwLM_'+x+'_'+z, scene);
      lm.diffuseColor  = new Color3(1, 1, 0.7);
      lm.emissiveColor = new Color3(0.8, 0.8, 0.3);
      light.material = lm;
    });
  }

  [-1, 1].forEach(end => {
    for (let x = -90; x <= 90; x += 22) {
      const tl = MeshBuilder.CreateSphere('thL_'+end+'_'+x,
        { diameter: 5 }, scene);
      tl.position.set(x, 2, end * 1390);
      tl.parent = root;
      const tm = new StandardMaterial('thLM_'+end+'_'+x, scene);
      tm.diffuseColor  = new Color3(1, 0.2, 0);
      tm.emissiveColor = new Color3(0.9, 0.1, 0);
      tl.material = tm;
    }
  });
}

// ── Windsock ──────────────────────────────────────────────────────────────────
function _buildWindsock(scene, root) {
  const poleMat = new StandardMaterial('wsPoleMat', scene);
  poleMat.diffuseColor = new Color3(0.75, 0.75, 0.75);

  const pole = MeshBuilder.CreateCylinder('wsPole', {
    height: 130, diameter: 4, tessellation: 8
  }, scene);
  pole.position.set(-160, 65, -1340);
  pole.parent = root;
  pole.material = poleMat;

  const sockMat = new StandardMaterial('wsSockMat', scene);
  sockMat.diffuseColor  = new Color3(1, 0.4, 0);
  sockMat.emissiveColor = new Color3(0.25, 0.08, 0);

  const sock = MeshBuilder.CreateCylinder('wsSock', {
    height: 55, diameterTop: 9,
    diameterBottom: 24, tessellation: 12
  }, scene);
  sock.position.set(-160, 135, -1340);
  sock.rotation.z = Math.PI / 4;
  sock.parent = root;
  sock.material = sockMat;

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