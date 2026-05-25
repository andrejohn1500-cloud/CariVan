import {
  MeshBuilder, StandardMaterial, Color3,
  Vector3, Animation, TransformNode
} from '@babylonjs/core';

// Argyle International Airport
// World position: east coast, z ≈ -7400, x ≈ 6800
// Road passes to the west — airport visible on the right going south

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
  _buildLandingPlane(scene, root);
  _buildPerimeterFence(scene, root);
  _buildWindsock(scene, root);

  return root;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Runway ────────────────────────────────────────────────────────────────────
function _buildRunway(scene, root) {
  // Main runway — 2800m long, 45m wide
  const rw = MeshBuilder.CreateBox('runway', {
    width: 180, height: 1, depth: 2800
  }, scene);
  rw.position.set(0, 0.5, 0);
  rw.parent = root;
  rw.material = _mat('rwMat', '#1a1a1a', scene, 0.04);

  // Runway centre line dashes
  for (let i = -1300; i < 1300; i += 120) {
    const dash = MeshBuilder.CreateBox('rwDash_'+i, {
      width: 2, height: 1.2, depth: 60
    }, scene);
    dash.position.set(0, 0.7, i);
    dash.parent = root;
    dash.material = _mat('rwDashMat', '#ffffff', scene, 0.1,
      new Color3(0.2, 0.2, 0.2));
  }

  // Runway threshold markings — both ends
  [-1, 1].forEach(end => {
    for (let lane = -3; lane <= 3; lane++) {
      const tm = MeshBuilder.CreateBox('thresh_'+end+'_'+lane, {
        width: 10, height: 1.2, depth: 45
      }, scene);
      tm.position.set(lane * 22, 0.7, end * 1320);
      tm.parent = root;
      tm.material = _mat('threshMat', '#ffffff', scene, 0.1);
    }
  });

  // Taxiway
  const taxi = MeshBuilder.CreateBox('taxiway', {
    width: 600, height: 0.8, depth: 60
  }, scene);
  taxi.position.set(200, 0.4, -400);
  taxi.parent = root;
  taxi.material = _mat('taxiMat', '#222222', scene, 0.03);

  // Taxiway yellow centre line
  const taxiLine = MeshBuilder.CreateBox('taxiLine', {
    width: 600, height: 1.0, depth: 3
  }, scene);
  taxiLine.position.set(200, 0.9, -400);
  taxiLine.parent = root;
  taxiLine.material = _mat('taxiLineMat', '#f0c800', scene, 0.1,
    new Color3(0.3, 0.25, 0));

  // Apron / stand area
  const apron = MeshBuilder.CreateBox('apron', {
    width: 700, height: 0.6, depth: 400
  }, scene);
  apron.position.set(250, 0.3, -600);
  apron.parent = root;
  apron.material = _mat('apronMat', '#2a2a2a', scene, 0.03);
}

// ── Terminal building ─────────────────────────────────────────────────────────
function _buildTerminal(scene, root) {
  // Main terminal body
  const term = _box('terminal', 600, 80, 180,
    250, 40, -750,
    _mat('termMat', '#d8cfc0', scene, 0.15), root, scene);

  // Roof overhang
  const roof = _box('termRoof', 640, 8, 200,
    250, 84, -750,
    _mat('roofMat', '#8a7a60', scene, 0.08), root, scene);

  // Glass facade — departure hall
  const glass = _box('termGlass', 580, 60, 8,
    250, 35, -845,
    _mat('glassMat', '#6090a8', scene, 0.8), root, scene);
  const gMat = scene.getMaterialByName('glassMat');
  if (gMat) gMat.alpha = 0.7;

  // Departure gates — jetways
  for (let g = 0; g < 4; g++) {
    const gx = -220 + g * 150;
    // Gate building
    _box('gate_'+g, 80, 50, 120,
      gx, 25, -700,
      _mat('gateMat'+g, '#cfc8b8', scene, 0.1), root, scene);
    // Jetway arm
    _box('jetway_'+g, 8, 12, 80,
      gx + 20, 18, -660,
      _mat('jetwayMat'+g, '#909090', scene, 0.2), root, scene);
  }

  // Check-in hall annex
  _box('checkin', 200, 55, 100,
    550, 27, -720,
    _mat('checkinMat', '#d0c8b8', scene, 0.12), root, scene);

  // Terminal sign
  const sign = _box('termSign', 300, 20, 5,
    250, 90, -846,
    _mat('signMat', '#003366', scene, 0.1,
      new Color3(0, 0.2, 0.5)), root, scene);

  // Covered walkway canopy
  for (let c = 0; c < 6; c++) {
    const cx = -220 + c * 100;
    _box('canopy_'+c, 8, 4, 60,
      cx, 55, -780,
      _mat('canopyMat', '#7a6a50', scene, 0.05), root, scene);
    // Support pillars
    _box('pillar_'+c, 6, 50, 6,
      cx, 25, -790,
      _mat('pillarMat', '#c0b8a8', scene, 0.1), root, scene);
  }
}

// ── Control tower ─────────────────────────────────────────────────────────────
function _buildTower(scene, root) {
  // Tower base
  _box('towerBase', 40, 20, 40,
    500, 10, -820,
    _mat('towerBaseMat', '#c8c0b0', scene, 0.1), root, scene);

  // Tower shaft
  _box('towerShaft', 28, 220, 28,
    500, 130, -820,
    _mat('towerShaftMat', '#d0c8b8', scene, 0.12), root, scene);

  // Tower cab — glass control room
  const cab = _box('towerCab', 55, 35, 55,
    500, 252, -820,
    _mat('towerCabMat', '#5888a0', scene, 0.9,
      new Color3(0.05, 0.15, 0.25)), root, scene);

  // Cab glass alpha
  const cabMat = scene.getMaterialByName('towerCabMat');
  if (cabMat) cabMat.alpha = 0.75;

  // Roof cap
  _box('towerRoof', 60, 8, 60,
    500, 272, -820,
    _mat('towerRoofMat', '#404040', scene, 0.05), root, scene);

  // Antenna
  const ant = MeshBuilder.CreateCylinder('antenna', {
    height: 60, diameter: 3, tessellation: 8
  }, scene);
  ant.position.set(500, 310, -820);
  ant.parent = root;
  ant.material = _mat('antMat', '#c0c0c0', scene, 0.5);

  // Flashing red beacon on antenna tip
  const beacon = MeshBuilder.CreateSphere('beacon', { diameter: 8 }, scene);
  beacon.position.set(500, 342, -820);
  beacon.parent = root;
  const bMat = _mat('beaconMat', '#ff2200', scene, 0.1,
    new Color3(1, 0.1, 0));
  beacon.material = bMat;

  // Beacon flash animation
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

// ── Parking lot ───────────────────────────────────────────────────────────────
function _buildParkingLot(scene, root) {
  // Lot surface
  const lot = _box('parking', 500, 0.5, 280,
    -200, 0.3, -820,
    _mat('lotMat', '#282828', scene, 0.03), root, scene);

  // Parking bays — white lines
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      const lx = -420 + col * 45;
      const lz = -720 + row * 80;
      // Bay line left
      _box('bayL_'+row+'_'+col, 2, 1, 50,
        lx, 1, lz,
        _mat('bayMat', '#e0e0e0', scene, 0.1), root, scene);
    }
  }

  // Parked cars in lot — simple boxes
  const carColors = ['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad','#16a085'];
  for (let i = 0; i < 18; i++) {
    const row = Math.floor(i / 6);
    const col = i % 6;
    const cx  = -400 + col * 70;
    const cz  = -730 + row * 80;
    const car = MeshBuilder.CreateBox('lotCar_'+i, {
      width: 35, height: 22, depth: 60
    }, scene);
    car.position.set(cx, 11, cz);
    car.parent = root;
    car.material = _mat('lotCarMat'+i, carColors[i % carColors.length], scene, 0.2);
    // Roof
    const carRoof = MeshBuilder.CreateBox('lotCarRoof_'+i, {
      width: 30, height: 14, depth: 35
    }, scene);
    carRoof.position.set(0, 18, -5);
    carRoof.parent = car;
    carRoof.material = car.material;
  }

  // Entrance road to parking
  _box('lotEntrance', 60, 0.5, 120,
    -450, 0.4, -660,
    _mat('entranceMat', '#1a1a1a', scene, 0.02), root, scene);

  // Street lights in lot
  for (let l = 0; l < 4; l++) {
    const lx = -380 + l * 120;
    // Pole
    const pole = MeshBuilder.CreateCylinder('lotPole_'+l, {
      height: 80, diameter: 4, tessellation: 8
    }, scene);
    pole.position.set(lx, 40, -680);
    pole.parent = root;
    pole.material = _mat('poleMat', '#808080', scene, 0.3);
    // Light head
    _box('lotLight_'+l, 20, 6, 20,
      lx, 82, -680,
      _mat('lightMat'+l, '#fffde0', scene, 0.1,
        new Color3(0.8, 0.8, 0.4)), root, scene);
  }
}

// ── Ground planes ─────────────────────────────────────────────────────────────
function _buildGroundPlanes(scene, root) {
  const planeConfigs = [
    { x:   0, z: -500, rot: 0,           livery: '#e8e8e8', name: 'SVG Air'    },
    { x:  80, z: -520, rot: 0.05,        livery: '#ddeeff', name: 'LIAT'       },
    { x: -80, z: -480, rot: -0.04,       livery: '#fff0e0', name: 'Caribbean'  },
    { x:   0, z:  600, rot: Math.PI,     livery: '#e8e8e8', name: 'Parked'     },
  ];

  planeConfigs.forEach((cfg, i) => {
    _buildPlaneModel('gndPlane_'+i, cfg.x, 1, cfg.z,
      cfg.rot, cfg.livery, scene, root, false);
  });
}

// ── Landing plane ─────────────────────────────────────────────────────────────
function _buildLandingPlane(scene, root) {
  const plane = _buildPlaneModel('landingPlane', -800, 400, -1800,
    0, '#e8f4ff', scene, root, true);

  // Approach animation — descend and roll along runway
  const posAnim = new Animation('approach', 'position.y', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  posAnim.setKeys([
    { frame:   0, value: 400  },
    { frame: 180, value:  80  },
    { frame: 300, value:   2  },
    { frame: 480, value:   2  },
    { frame: 600, value: 400  },
  ]);

  const zAnim = new Animation('approachZ', 'position.z', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  zAnim.setKeys([
    { frame:   0, value: -1800 },
    { frame: 180, value: -1000 },
    { frame: 300, value:  -200 },
    { frame: 480, value:  1400 },
    { frame: 600, value: -1800 },
  ]);

  const xAnim = new Animation('approachX', 'position.x', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  xAnim.setKeys([
    { frame:   0, value: -800 },
    { frame: 300, value:    0 },
    { frame: 480, value:    0 },
    { frame: 600, value: -800 },
  ]);

  // Pitch down on approach
  const pitchAnim = new Animation('pitch', 'rotation.x', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  pitchAnim.setKeys([
    { frame:   0, value:  0.0  },
    { frame: 180, value:  0.12 },
    { frame: 300, value:  0.0  },
    { frame: 480, value:  0.0  },
    { frame: 600, value:  0.0  },
  ]);

  plane.animations = [posAnim, zAnim, xAnim, pitchAnim];
  scene.beginAnimation(plane, 0, 600, true);
}

// ── Shared plane builder ──────────────────────────────────────────────────────
function _buildPlaneModel(name, x, y, z, rotY, livery, scene, parent, animated) {
  const planeRoot = new TransformNode(name, scene);
  planeRoot.position.set(x, y, z);
  planeRoot.rotation.y = rotY;
  planeRoot.parent = parent;

  const livMat  = _mat(name+'_liv',  livery,   scene, 0.2);
  const darkMat = _mat(name+'_dark', '#222222', scene, 0.05);
  const glasMat = _mat(name+'_glas', '#8ab0c8', scene, 0.8);
  if (glasMat) glasMat.alpha = 0.7;
  const engMat  = _mat(name+'_eng',  '#505050', scene, 0.3);
  const redMat  = _mat(name+'_red',  '#cc2200', scene, 0.1);

  // Fuselage
  const fuse = MeshBuilder.CreateCylinder(name+'_fuse', {
    height: 380, diameterTop: 38, diameterBottom: 28,
    tessellation: 16
  }, scene);
  fuse.rotation.x = Math.PI / 2;
  fuse.position.set(0, 0, 0);
  fuse.parent = planeRoot;
  fuse.material = livMat;

  // Nose cone
  const nose = MeshBuilder.CreateCylinder(name+'_nose', {
    height: 60, diameterTop: 0, diameterBottom: 28, tessellation: 16
  }, scene);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0, -220);
  nose.parent = planeRoot;
  nose.material = livMat;

  // Cockpit windows
  _box(name+'_cockpit', 20, 14, 4,
    0, 12, -200, glasMat, planeRoot, scene);

  // Main wings
  [-1, 1].forEach(side => {
    const wing = MeshBuilder.CreateBox(name+'_wing_'+side, {
      width: 280, height: 6, depth: 80
    }, scene);
    wing.position.set(side * 140, -4, 20);
    wing.parent = planeRoot;
    wing.material = livMat;

    // Wing tip
    const tip = MeshBuilder.CreateBox(name+'_tip_'+side, {
      width: 30, height: 14, depth: 20
    }, scene);
    tip.position.set(side * 18, 8, 0);
    tip.parent = wing;
    tip.material = livMat;

    // Engine pod
    const eng = MeshBuilder.CreateCylinder(name+'_eng_'+side, {
      height: 80, diameter: 28, tessellation: 16
    }, scene);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(side * 90, -14, 10);
    eng.parent = planeRoot;
    eng.material = engMat;

    // Engine intake
    const intake = MeshBuilder.CreateCylinder(name+'_intake_'+side, {
      height: 8, diameterTop: 28, diameterBottom: 22, tessellation: 16
    }, scene);
    intake.rotation.x = Math.PI / 2;
    intake.position.set(side * 90, -14, -28);
    intake.parent = planeRoot;
    intake.material = darkMat;

    // Nav light
    const nav = MeshBuilder.CreateSphere(name+'_nav_'+side, { diameter: 6 }, scene);
    nav.position.set(side * 155, -2, 10);
    nav.parent = planeRoot;
    nav.material = _mat(name+'_nav_mat_'+side,
      side < 0 ? '#ff4444' : '#44ff44', scene, 0.1,
      side < 0 ? new Color3(0.8, 0, 0) : new Color3(0, 0.8, 0));
  });

  // Tail fin
  const tail = MeshBuilder.CreateBox(name+'_tail', {
    width: 5, height: 80, depth: 90
  }, scene);
  tail.position.set(0, 40, 175);
  tail.parent = planeRoot;
  tail.material = livMat;

  // Horizontal stabilisers
  [-1, 1].forEach(side => {
    const stab = MeshBuilder.CreateBox(name+'_stab_'+side, {
      width: 120, height: 5, depth: 50
    }, scene);
    stab.position.set(side * 60, 30, 170);
    stab.parent = planeRoot;
    stab.material = livMat;
  });

  // Fuselage stripe
  const stripe = MeshBuilder.CreateBox(name+'_stripe', {
    width: 6, height: 8, depth: 360
  }, scene);
  stripe.position.set(0, 16, 0);
  stripe.parent = planeRoot;
  stripe.material = redMat;

  // Windows row
  for (let w = -7; w <= 7; w++) {
    const win = MeshBuilder.CreateBox(name+'_win_'+w, {
      width: 4, height: 10, depth: 12
    }, scene);
    win.position.set(20, 10, w * 24);
    win.parent = planeRoot;
    win.material = glasMat;
  }

  // Landing gear — only visible when near ground
  if (!animated) {
    [-1, 1].forEach(side => {
      const gear = MeshBuilder.CreateCylinder(name+'_gear_'+side, {
        height: 30, diameter: 6, tessellation: 8
      }, scene);
      gear.position.set(side * 60, -22, 20);
      gear.parent = planeRoot;
      gear.material = darkMat;

      const wheel = MeshBuilder.CreateCylinder(name+'_wheel_'+side, {
        height: 10, diameter: 18, tessellation: 12
      }, scene);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, -16, 0);
      wheel.parent = gear;
      wheel.material = darkMat;
    });

    // Nose gear
    const nGear = MeshBuilder.CreateCylinder(name+'_ngear', {
      height: 24, diameter: 5, tessellation: 8
    }, scene);
    nGear.position.set(0, -18, -160);
    nGear.parent = planeRoot;
    nGear.material = darkMat;
  }

  return planeRoot;
}

// ── Perimeter fence ───────────────────────────────────────────────────────────
function _buildPerimeterFence(scene, root) {
  const segments = [
    { x: -500, z: -1400, w: 1000, d: 4 },
    { x: -500, z:  800,  w: 1000, d: 4 },
    { x: -996, z: -300,  w: 4,    d: 2200 },
    { x:  496, z: -300,  w: 4,    d: 2200 },
  ];
  segments.forEach((s, i) => {
    _box('fence_'+i, s.w, 18, s.d,
      s.x, 9, s.z,
      _mat('fenceMat', '#808878', scene, 0.05), root, scene);
  });

  // Fence posts
  for (let p = -9; p <= 9; p++) {
    _box('fencePost_top_'+p, 5, 22, 5,
      p * 100, 11, -1400,
      _mat('postMat', '#909080', scene, 0.1), root, scene);
    _box('fencePost_bot_'+p, 5, 22, 5,
      p * 100, 11,  800,
      _mat('postMat2', '#909080', scene, 0.1), root, scene);
  }
}

// ── Windsock ──────────────────────────────────────────────────────────────────
function _buildWindsock(scene, root) {
  // Pole
  const pole = MeshBuilder.CreateCylinder('wsPole', {
    height: 120, diameter: 4, tessellation: 8
  }, scene);
  pole.position.set(-150, 60, -1300);
  pole.parent = root;
  pole.material = _mat('wsPoleMat', '#c0c0c0', scene, 0.4);

  // Sock — orange/white cylinder
  const sock = MeshBuilder.CreateCylinder('wsSock', {
    height: 50, diameterTop: 8,
    diameterBottom: 22, tessellation: 12
  }, scene);
  sock.position.set(-150, 126, -1300);
  sock.rotation.z = Math.PI / 4;
  sock.parent = root;
  sock.material = _mat('wsSockMat', '#ff6600', scene, 0.1,
    new Color3(0.3, 0.1, 0));

  // Gentle sway animation
  const sway = new Animation('wsSway', 'rotation.z', 30,
    Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
  sway.setKeys([
    { frame:  0, value:  Math.PI / 4       },
    { frame: 40, value:  Math.PI / 4 + 0.3 },
    { frame: 80, value:  Math.PI / 4 - 0.1 },
    { frame: 120,value:  Math.PI / 4       },
  ]);
  sock.animations = [sway];
  scene.beginAnimation(sock, 0, 120, true);
}