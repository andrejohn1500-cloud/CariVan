import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

// Argyle International Airport — St. Vincent & the Grenadines
// Coordinates: 13.1567°N, 61.1499°W (windward side)

function mat(scene, name, r, g, b, spec, alpha) {
  const m = new StandardMaterial(name + '_' + Math.random().toString(36).slice(2,5), scene);
  m.diffuseColor  = new Color3(r, g, b);
  m.specularColor = new Color3(spec ?? 0.06, spec ?? 0.06, spec ?? 0.06);
  if (alpha !== undefined) m.alpha = alpha;
  return m;
}

function geoToWorld(lat, lon) {
  const S = { south:12.97, north:13.58, west:-61.50, east:-61.10, worldWidth:29000, worldHeight:45000 };
  return {
    x: ((lon - S.west)  / (S.east  - S.west))  * S.worldWidth  - S.worldWidth  / 2,
    z: ((lat - S.south) / (S.north - S.south)) * S.worldHeight - S.worldHeight / 2
  };
}

function getY(terrain, x, z) {
  return terrain ? (terrain.getHeightAtCoordinates(x, z) || 0) : 0;
}

// ── ARGYLE AIRPORT ORIGIN ────────────────────────────────────────
const ARGYLE = geoToWorld(13.1567, -61.1499);

export function buildArgyleAirport(scene, terrain) {
  const ox = ARGYLE.x;
  const oz = ARGYLE.z;
  const groundY = getY(terrain, ox, oz);

  buildRunway(scene, ox, oz, groundY);
  buildTaxiway(scene, ox, oz, groundY);
  buildApron(scene, ox, oz, groundY);
  buildTerminal(scene, ox, oz, groundY);
  buildControlTower(scene, ox, oz, groundY);
  buildParking(scene, terrain, ox, oz, groundY);
  buildPlanes(scene, ox, oz, groundY);
  buildBaggageLorry(scene, ox, oz, groundY);
  buildFuelTruck(scene, ox, oz, groundY);
  buildFireTruck(scene, ox, oz, groundY);
  buildPerimeterFence(scene, ox, oz, groundY);
  buildWindsock(scene, ox, oz, groundY);
  buildApronLights(scene, ox, oz, groundY);
}

// ── RUNWAY ──────────────────────────────────────────────────────
function buildRunway(scene, ox, oz, gy) {
  // Main runway — Argyle is ~1800m long, oriented roughly E-W
  const runway = MeshBuilder.CreateBox('argyle_runway', {
    width: 380, height: 6, depth: 9200
  }, scene);
  runway.position.set(ox, gy + 3, oz - 1000);
  runway.material = mat(scene, 'rwy', 0.14, 0.14, 0.15);
  runway.receiveShadows = true;

  // Runway threshold markings (white bars at each end)
  [4400, -4400].forEach((zOff, end) => {
    for (let b = 0; b < 8; b++) {
      const bar = MeshBuilder.CreateBox('rwyBar_' + end + b, {
        width: 30, height: 7, depth: 180
      }, scene);
      bar.position.set(ox - 130 + b * 38, gy + 4, oz - 1000 + zOff);
      bar.material = mat(scene, 'rwyMk', 0.92, 0.92, 0.92);
    }
  });

  // Centre line dashes
  for (let d = 0; d < 36; d++) {
    const dash = MeshBuilder.CreateBox('rwyDash_' + d, {
      width: 14, height: 7, depth: 160
    }, scene);
    dash.position.set(ox, gy + 4, oz - 4200 + d * 240);
    dash.material = mat(scene, 'rwyDsh', 0.92, 0.92, 0.92);
  }

  // Runway edge lights (yellow boxes)
  for (let l = 0; l < 24; l++) {
    [-195, 195].forEach((xOff, side) => {
      const light = MeshBuilder.CreateBox('rwyLt_' + l + side, {
        width: 22, height: 18, depth: 22
      }, scene);
      light.position.set(ox + xOff, gy + 9, oz - 4000 + l * 360);
      const lm = mat(scene, 'rwyLtM', 0.95, 0.92, 0.20, 0.4);
      lm.emissiveColor = new Color3(0.4, 0.38, 0.05);
      light.material = lm;
    });
  }

  // Runway numbers "09" and "27" at each end
  const numMat = mat(scene, 'rwyNum', 0.92, 0.92, 0.92);
  // "09" end
  for (let nb = 0; nb < 3; nb++) {
    const nb1 = MeshBuilder.CreateBox('rwyN09_' + nb, { width: 20, height: 7, depth: 80 }, scene);
    nb1.position.set(ox - 40 + nb * 40, gy + 4, oz - 4000);
    nb1.material = numMat;
  }
  // "27" end
  for (let nb = 0; nb < 3; nb++) {
    const nb2 = MeshBuilder.CreateBox('rwyN27_' + nb, { width: 20, height: 7, depth: 80 }, scene);
    nb2.position.set(ox - 40 + nb * 40, gy + 4, oz + 2200);
    nb2.material = numMat;
  }

  // Displaced threshold (yellow chevrons, windward end)
  for (let c = 0; c < 4; c++) {
    const chev = MeshBuilder.CreateBox('chev_' + c, { width: 280, height: 7, depth: 20 }, scene);
    chev.position.set(ox, gy + 4, oz + 2400 + c * 55);
    chev.material = mat(scene, 'chevM', 0.92, 0.82, 0.0);
  }

  // Blast pad (gravel — grey at runway ends)
  [oz - 5000, oz + 3000].forEach((zp, i) => {
    const bp = MeshBuilder.CreateBox('blastPad_' + i, { width: 380, height: 4, depth: 600 }, scene);
    bp.position.set(ox, gy + 2, zp);
    bp.material = mat(scene, 'bpM', 0.48, 0.46, 0.44);
  });
}

// ── TAXIWAY ──────────────────────────────────────────────────────
function buildTaxiway(scene, ox, oz, gy) {
  // Parallel taxiway
  const taxi = MeshBuilder.CreateBox('taxiway', { width: 220, height: 5, depth: 8000 }, scene);
  taxi.position.set(ox - 600, gy + 2.5, oz - 800);
  taxi.material = mat(scene, 'taxi', 0.16, 0.16, 0.17);

  // Taxiway centre line (yellow)
  for (let d = 0; d < 30; d++) {
    const tDash = MeshBuilder.CreateBox('taxiDash_' + d, { width: 10, height: 6, depth: 130 }, scene);
    tDash.position.set(ox - 600, gy + 3.5, oz - 3800 + d * 270);
    tDash.material = mat(scene, 'taxiLn', 0.90, 0.78, 0.0);
  }

  // Connector taxiways (linking runway to parallel)
  [-2000, 0, 2000].forEach((zOff, i) => {
    const conn = MeshBuilder.CreateBox('taxiConn_' + i, { width: 600, height: 5, depth: 200 }, scene);
    conn.position.set(ox - 300, gy + 2.5, oz + zOff - 600);
    conn.material = mat(scene, 'taxiC', 0.16, 0.16, 0.17);
  });

  // Holding position markings (yellow/black bars before runway)
  for (let hb = 0; hb < 4; hb++) {
    const hold = MeshBuilder.CreateBox('holdBar_' + hb, { width: 220, height: 6, depth: 12 }, scene);
    hold.position.set(ox - 300, gy + 3.5, oz - 2500 + hb * 18);
    hold.material = mat(scene, 'holdM', hb % 2 === 0 ? 0.90 : 0.08, hb % 2 === 0 ? 0.78 : 0.08, 0.0);
  }
}

// ── APRON ─────────────────────────────────────────────────────────
function buildApron(scene, ox, oz, gy) {
  // Main apron (concrete)
  const apron = MeshBuilder.CreateBox('apron', { width: 2200, height: 5, depth: 2000 }, scene);
  apron.position.set(ox - 1500, gy + 2.5, oz - 500);
  apron.material = mat(scene, 'apr', 0.60, 0.58, 0.54);

  // Parking bay lines (white)
  for (let pb = 0; pb < 5; pb++) {
    // Nose-in guide line
    const guide = MeshBuilder.CreateBox('pbGuide_' + pb, { width: 12, height: 6, depth: 600 }, scene);
    guide.position.set(ox - 800 - pb * 380, gy + 3.5, oz - 400);
    guide.material = mat(scene, 'pbG', 0.92, 0.92, 0.92);

    // Parking box outline
    const boxL = MeshBuilder.CreateBox('pbBoxL_' + pb, { width: 10, height: 6, depth: 700 }, scene);
    boxL.position.set(ox - 620 - pb * 380, gy + 3.5, oz - 380);
    boxL.material = mat(scene, 'pbBL', 0.92, 0.92, 0.92);

    const boxR = MeshBuilder.CreateBox('pbBoxR_' + pb, { width: 10, height: 6, depth: 700 }, scene);
    boxR.position.set(ox - 990 - pb * 380, gy + 3.5, oz - 380);
    boxR.material = mat(scene, 'pbBR', 0.92, 0.92, 0.92);
  }

  // Apron flood lights (tall poles)
  [[-500, -1200], [-1500, -1200], [-2500, -1200],
   [-500,  300],  [-1500,  300],  [-2500,  300]].forEach(([xo, zo], i) => {
    const pole = MeshBuilder.CreateCylinder('apLtPole_' + i, {
      diameter: 25, height: 700, tessellation: 8
    }, scene);
    pole.position.set(ox + xo, gy + 350, oz + zo);
    pole.material = mat(scene, 'apPM', 0.72, 0.72, 0.72);

    // Light head
    const head = MeshBuilder.CreateBox('apLtHead_' + i, { width: 120, height: 35, depth: 60 }, scene);
    head.position.set(ox + xo, gy + 710, oz + zo);
    const hm = mat(scene, 'apLH', 0.95, 0.92, 0.75, 0.5);
    hm.emissiveColor = new Color3(0.3, 0.28, 0.12);
    head.material = hm;
  });
}

// ── TERMINAL BUILDING ────────────────────────────────────────────
function buildTerminal(scene, ox, oz, gy) {
  // Main terminal — modern building, glass and concrete
  const term = MeshBuilder.CreateBox('argyle_terminal', {
    width: 2800, height: 600, depth: 700
  }, scene);
  term.position.set(ox - 1500, gy + 300, oz - 1200);
  term.material = mat(scene, 'term', 0.88, 0.86, 0.82, 0.1);

  // Glass facade (front face — blue tinted)
  const facade = MeshBuilder.CreateBox('term_facade', {
    width: 2800, height: 580, depth: 30
  }, scene);
  facade.position.set(ox - 1500, gy + 295, oz - 870);
  facade.material = mat(scene, 'facade', 0.45, 0.62, 0.80, 0.4, 0.55);

  // Roof — modern flat with overhang
  const roof = MeshBuilder.CreateBox('term_roof', {
    width: 3000, height: 60, depth: 760
  }, scene);
  roof.position.set(ox - 1500, gy + 630, oz - 1200);
  roof.material = mat(scene, 'tRoof', 0.20, 0.40, 0.65, 0.1);

  // Roof overhang (covers departures drop-off)
  const overhang = MeshBuilder.CreateBox('term_overhang', {
    width: 3000, height: 40, depth: 400
  }, scene);
  overhang.position.set(ox - 1500, gy + 628, oz - 660);
  overhang.material = mat(scene, 'ovhg', 0.20, 0.40, 0.65, 0.1);

  // Overhang support columns
  for (let c = 0; c < 8; c++) {
    const col = MeshBuilder.CreateBox('ovCol_' + c, { width: 45, height: 420, depth: 45 }, scene);
    col.position.set(ox - 2650 + c * 400, gy + 210, oz - 660);
    col.material = mat(scene, 'colM', 0.82, 0.80, 0.78);
  }

  // Departure level windows (long horizontal strips)
  for (let w = 0; w < 6; w++) {
    const win = MeshBuilder.CreateBox('termWin_' + w, { width: 380, height: 160, depth: 25 }, scene);
    win.position.set(ox - 2450 + w * 430, gy + 400, oz - 858);
    win.material = mat(scene, 'twM', 0.40, 0.62, 0.88, 0.4, 0.65);
  }

  // Terminal sign "ARGYLE INTERNATIONAL AIRPORT"
  const sign = MeshBuilder.CreateBox('argyle_sign', { width: 1800, height: 120, depth: 40 }, scene);
  sign.position.set(ox - 1500, gy + 640, oz - 858);
  sign.material = mat(scene, 'signM', 0.0, 0.25, 0.60);

  // SVG Flag on terminal
  const flagPole = MeshBuilder.CreateCylinder('termFlagPole', { diameter: 18, height: 500, tessellation: 6 }, scene);
  flagPole.position.set(ox - 2780, gy + 880, oz - 1200);
  flagPole.material = mat(scene, 'tfpM', 0.80, 0.80, 0.80);

  // Flag panels (SVG blue/gold/green)
  const flagBlue = MeshBuilder.CreateBox('flagBlue', { width: 220, height: 130, depth: 8 }, scene);
  flagBlue.position.set(ox - 2670, gy + 1050, oz - 1200);
  flagBlue.material = mat(scene, 'fbM', 0.0, 0.35, 0.75);

  const flagGold = MeshBuilder.CreateBox('flagGold', { width: 220, height: 60, depth: 8 }, scene);
  flagGold.position.set(ox - 2670, gy + 960, oz - 1200);
  flagGold.material = mat(scene, 'fgM', 0.92, 0.75, 0.0);

  const flagGreen = MeshBuilder.CreateBox('flagGreen', { width: 220, height: 130, depth: 8 }, scene);
  flagGreen.position.set(ox - 2670, gy + 870, oz - 1200);
  flagGreen.material = mat(scene, 'fgrM', 0.0, 0.55, 0.18);

  // Arrivals/Departures doors (glass)
  ['ARR', 'DEP', 'DEP2'].forEach((label, i) => {
    const door = MeshBuilder.CreateBox('termDoor_' + label, { width: 180, height: 280, depth: 28 }, scene);
    door.position.set(ox - 2200 + i * 700, gy + 145, oz - 858);
    door.material = mat(scene, 'tdM', 0.55, 0.72, 0.88, 0.4, 0.70);
  });

  // Jet bridges / airstairs (3 gates)
  [0, 1, 2].forEach(gate => {
    const bridge = MeshBuilder.CreateBox('jetbridge_' + gate, {
      width: 80, height: 120, depth: 500
    }, scene);
    bridge.position.set(ox - 800 - gate * 380, gy + 220, oz - 980);
    bridge.rotation.y = 0.15;
    bridge.material = mat(scene, 'jbM', 0.72, 0.72, 0.74);
  });

  // Cargo building (separate, smaller)
  const cargo = MeshBuilder.CreateBox('cargo_bldg', { width: 700, height: 350, depth: 450 }, scene);
  cargo.position.set(ox + 400, gy + 175, oz - 1200);
  cargo.material = mat(scene, 'crgM', 0.75, 0.72, 0.68);

  const cargoSign = MeshBuilder.CreateBox('cargo_sign', { width: 400, height: 80, depth: 25 }, scene);
  cargoSign.position.set(ox + 400, gy + 390, oz - 980);
  cargoSign.material = mat(scene, 'csM', 0.55, 0.35, 0.08);

  // Ground transport shelter / bus bay
  const busBay = MeshBuilder.CreateBox('busBay', { width: 800, height: 50, depth: 280 }, scene);
  busBay.position.set(ox - 1500, gy + 320, oz - 560);
  busBay.material = mat(scene, 'bbM', 0.20, 0.40, 0.65, 0.1);

  // Bus bay columns
  for (let bc = 0; bc < 5; bc++) {
    const bcol = MeshBuilder.CreateBox('bbCol_' + bc, { width: 30, height: 320, depth: 30 }, scene);
    bcol.position.set(ox - 2200 + bc * 400, gy + 160, oz - 560);
    bcol.material = mat(scene, 'bbcM', 0.78, 0.78, 0.78);
  }
}

// ── CONTROL TOWER ────────────────────────────────────────────────
function buildControlTower(scene, ox, oz, gy) {
  // Base/plinth
  const base = MeshBuilder.CreateBox('tower_base', { width: 280, height: 200, depth: 280 }, scene);
  base.position.set(ox - 2600, gy + 100, oz - 1300);
  base.material = mat(scene, 'tBase', 0.82, 0.80, 0.76);

  // Shaft — tapers slightly
  const shaft = MeshBuilder.CreateCylinder('tower_shaft', {
    diameterBottom: 160, diameterTop: 120,
    height: 1400, tessellation: 12
  }, scene);
  shaft.position.set(ox - 2600, gy + 900, oz - 1300);
  shaft.material = mat(scene, 'tShaft', 0.84, 0.82, 0.78);

  // Cab (glass cab at top — wider than shaft)
  const cab = MeshBuilder.CreateCylinder('tower_cab', {
    diameter: 280, height: 200, tessellation: 12
  }, scene);
  cab.position.set(ox - 2600, gy + 1700, oz - 1300);
  cab.material = mat(scene, 'tCab', 0.40, 0.62, 0.85, 0.5, 0.65);

  // Cab roof
  const cabRoof = MeshBuilder.CreateCylinder('tower_cabRoof', {
    diameter: 300, height: 60, tessellation: 12
  }, scene);
  cabRoof.position.set(ox - 2600, gy + 1830, oz - 1300);
  cabRoof.material = mat(scene, 'tCR', 0.20, 0.40, 0.65);

  // Antenna mast
  const antenna = MeshBuilder.CreateCylinder('tower_antenna', {
    diameter: 15, height: 300, tessellation: 6
  }, scene);
  antenna.position.set(ox - 2600, gy + 2030, oz - 1300);
  antenna.material = mat(scene, 'antM', 0.72, 0.72, 0.72);

  // Radar dish
  const radar = MeshBuilder.CreateCylinder('radar', {
    diameter: 120, height: 20, tessellation: 16
  }, scene);
  radar.position.set(ox - 2500, gy + 1860, oz - 1300);
  radar.rotation.z = Math.PI / 3;
  radar.material = mat(scene, 'radM', 0.88, 0.88, 0.88, 0.3);

  // Red aviation warning lights
  [1650, 1000].forEach((h, i) => {
    const wLight = MeshBuilder.CreateCylinder('wLight_' + i, { diameter: 30, height: 20, tessellation: 8 }, scene);
    wLight.position.set(ox - 2600, gy + h, oz - 1300);
    const wm = mat(scene, 'wlM' + i, 0.92, 0.08, 0.08, 0.3);
    wm.emissiveColor = new Color3(0.6, 0.02, 0.02);
    wLight.material = wm;
  });

  // Equipment room attached to base
  const eqRoom = MeshBuilder.CreateBox('eq_room', { width: 350, height: 250, depth: 300 }, scene);
  eqRoom.position.set(ox - 2450, gy + 125, oz - 1300);
  eqRoom.material = mat(scene, 'eqM', 0.78, 0.76, 0.72);
}

// ── PLANES ───────────────────────────────────────────────────────
function buildPlane(scene, ox, oz, gy, xOff, zOff, rotY, livery, name) {
  const px = ox + xOff, pz = oz + zOff;
  const py = gy + 8;

  // Fuselage
  const fuse = MeshBuilder.CreateCylinder('fuse_' + name, {
    diameterTop: 160, diameterBottom: 160,
    height: 2600, tessellation: 16
  }, scene);
  fuse.rotation.x = Math.PI / 2;
  fuse.rotation.y = rotY;
  fuse.position.set(px, py + 155, pz);
  fuse.material = mat(scene, 'fuseM_' + name, 0.92, 0.92, 0.92);

  // Nose cone
  const nose = MeshBuilder.CreateCylinder('nose_' + name, {
    diameterTop: 0, diameterBottom: 160,
    height: 300, tessellation: 16
  }, scene);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.y = rotY;
  const noseOff = { x: Math.sin(rotY) * 1450, z: Math.cos(rotY) * 1450 };
  nose.position.set(px + noseOff.x, py + 155, pz + noseOff.z);
  nose.material = mat(scene, 'noseM_' + name, 0.88, 0.88, 0.88);

  // Cockpit windows (dark)
  const cwOff = { x: Math.sin(rotY) * 1100, z: Math.cos(rotY) * 1100 };
  const cw = MeshBuilder.CreateBox('cw_' + name, { width: 80, height: 60, depth: 40 }, scene);
  cw.position.set(px + cwOff.x, py + 225, pz + cwOff.z);
  cw.material = mat(scene, 'cwM', 0.08, 0.12, 0.20, 0.3, 0.55);

  // Fuselage windows (row)
  for (let w = 0; w < 10; w++) {
    const wo = { x: Math.sin(rotY) * (-800 + w * 160), z: Math.cos(rotY) * (-800 + w * 160) };
    const fw = MeshBuilder.CreateBox('fw_' + name + w, { width: 35, height: 38, depth: 40 }, scene);
    fw.position.set(px + wo.x, py + 180, pz + wo.z);
    fw.material = mat(scene, 'fwM', 0.55, 0.72, 0.88, 0.4, 0.65);
  }

  // Livery stripe
  const stripe = MeshBuilder.CreateCylinder('stripe_' + name, {
    diameter: 162, height: 2400, tessellation: 16
  }, scene);
  stripe.rotation.x = Math.PI / 2;
  stripe.rotation.y = rotY;
  stripe.position.set(px, py + 120, pz);
  stripe.material = mat(scene, 'strM_' + name, livery[0], livery[1], livery[2], 0.1, 0.85);

  // Wings
  const wing = MeshBuilder.CreateBox('wing_' + name, { width: 3200, height: 30, depth: 600 }, scene);
  wing.rotation.y = rotY;
  wing.position.set(px, py + 140, pz);
  wing.material = mat(scene, 'wingM', 0.88, 0.88, 0.88);

  // Wing tips (angled)
  [-1600, 1600].forEach((wx, wi) => {
    const wt = MeshBuilder.CreateBox('wt_' + name + wi, { width: 220, height: 80, depth: 150 }, scene);
    const wtOff = { x: Math.cos(rotY) * wx, z: -Math.sin(rotY) * wx };
    wt.position.set(px + wtOff.x, py + 200, pz + wtOff.z);
    wt.rotation.z = wi === 0 ? 0.4 : -0.4;
    wt.material = mat(scene, 'wtM', 0.88, 0.88, 0.88);
  });

  // Tail fin
  const tail = MeshBuilder.CreateBox('tail_' + name, { width: 30, height: 400, depth: 500 }, scene);
  const tailOff = { x: Math.sin(rotY) * -1150, z: Math.cos(rotY) * -1150 };
  tail.rotation.y = rotY;
  tail.position.set(px + tailOff.x, py + 300, pz + tailOff.z);
  tail.material = mat(scene, 'tailM', livery[0], livery[1], livery[2]);

  // Horizontal stabilisers
  const hStab = MeshBuilder.CreateBox('hstab_' + name, { width: 1000, height: 20, depth: 300 }, scene);
  hStab.rotation.y = rotY;
  hStab.position.set(px + tailOff.x, py + 150, pz + tailOff.z);
  hStab.material = mat(scene, 'hsM', 0.88, 0.88, 0.88);

  // Engines (2, under wings)
  [-900, 900].forEach((wx, ei) => {
    const engOff = { x: Math.cos(rotY) * wx, z: -Math.sin(rotY) * wx };
    const eng = MeshBuilder.CreateCylinder('eng_' + name + ei, {
      diameter: 120, height: 600, tessellation: 12
    }, scene);
    eng.rotation.x = Math.PI / 2;
    eng.rotation.y = rotY;
    eng.position.set(px + engOff.x, py + 80, pz + engOff.z);
    eng.material = mat(scene, 'engM', 0.35, 0.35, 0.38, 0.2);

    // Engine intake ring
    const intake = MeshBuilder.CreateTorus('intake_' + name + ei, {
      diameter: 130, thickness: 18, tessellation: 16
    }, scene);
    intake.rotation.x = Math.PI / 2;
    intake.rotation.y = rotY;
    const intFwd = { x: Math.sin(rotY) * 310, z: Math.cos(rotY) * 310 };
    intake.position.set(px + engOff.x + intFwd.x, py + 80, pz + engOff.z + intFwd.z);
    intake.material = mat(scene, 'intM', 0.55, 0.55, 0.58, 0.4);
  });

  // Landing gear (wheels visible when parked)
  const gearPositions = [
    { x: Math.sin(rotY)*600, z: Math.cos(rotY)*600 },  // nose gear
    { x: Math.cos(rotY)*(-250), z: -Math.sin(rotY)*(-250) }, // left main
    { x: Math.cos(rotY)*(250),  z: -Math.sin(rotY)*(250)  }, // right main
  ];
  gearPositions.forEach((gp, gi) => {
    const wheel = MeshBuilder.CreateCylinder('gear_' + name + gi, {
      diameter: gi === 0 ? 55 : 80, height: 45, tessellation: 12
    }, scene);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(px + gp.x, py + (gi === 0 ? 20 : 15), pz + gp.z);
    wheel.material = mat(scene, 'gearM', 0.10, 0.10, 0.10);

    // Gear strut
    const strut = MeshBuilder.CreateBox('strut_' + name + gi, {
      width: 20, height: gi === 0 ? 120 : 140, depth: 20
    }, scene);
    strut.position.set(px + gp.x, py + (gi === 0 ? 80 : 90), pz + gp.z);
    strut.material = mat(scene, 'strutM', 0.72, 0.72, 0.72);
  });

  return fuse;
}

function buildPlanes(scene, ox, oz, gy) {
  buildPlane(scene, ox, oz, gy, -800, -800, 0, [0.0, 0.55, 0.65], 'LIAT1');
  buildPlane(scene, ox, oz, gy, -1200, -800, 0, [0.82, 0.08, 0.15], 'CAL1');
  buildPlane(scene, ox, oz, gy, 0, -200, 0.08, [0.25, 0.45, 0.75], 'AA1');
  buildSmallPlane(scene, ox + 600, oz - 800, gy);
}

function buildSmallPlane(scene, px, pz, gy) {
  const fuse = MeshBuilder.CreateCylinder('smallFuse', {
    diameter: 60, height: 800, tessellation: 10
  }, scene);
  fuse.rotation.x = Math.PI / 2;
  fuse.position.set(px, gy + 55, pz);
  fuse.material = mat(scene, 'sfM', 0.92, 0.88, 0.20);

  const wing = MeshBuilder.CreateBox('smallWing', { width: 1200, height: 12, depth: 220 }, scene);
  wing.position.set(px, gy + 58, pz);
  wing.material = mat(scene, 'swM', 0.88, 0.85, 0.18);

  const prop = MeshBuilder.CreateBox('prop', { width: 260, height: 15, depth: 20 }, scene);
  prop.position.set(px, gy + 60, pz + 420);
  prop.material = mat(scene, 'propM', 0.15, 0.15, 0.15);

  const tail = MeshBuilder.CreateBox('sTail', { width: 12, height: 160, depth: 200 }, scene);
  tail.position.set(px, gy + 100, pz - 360);
  tail.material = mat(scene, 'stM', 0.92, 0.88, 0.20);
}

function buildBaggageLorry(scene, ox, oz, gy) {
  const px = ox - 1000, pz = oz - 700;

  const cab = MeshBuilder.CreateBox('bagTug_cab', { width: 200, height: 180, depth: 280 }, scene);
  cab.position.set(px, gy + 95, pz);
  cab.material = mat(scene, 'tugM', 0.92, 0.72, 0.0);

  const cabRoof = MeshBuilder.CreateBox('tugRoof', { width: 210, height: 30, depth: 290 }, scene);
  cabRoof.position.set(px, gy + 195, pz);
  cabRoof.material = mat(scene, 'tugRM', 0.88, 0.45, 0.0);

  const ws = MeshBuilder.CreateBox('tugWS', { width: 160, height: 100, depth: 15 }, scene);
  ws.position.set(px, gy + 130, pz + 148);
  ws.material = mat(scene, 'tugWM', 0.50, 0.70, 0.85, 0.3, 0.65);

  [[-90,100],[90,100],[-90,-100],[90,-100]].forEach(([wx,wz],i) => {
    const tw = MeshBuilder.CreateCylinder('tugW_'+i, { diameter:65, height:45, tessellation:10 }, scene);
    tw.rotation.z = Math.PI/2;
    tw.position.set(px+wx, gy+33, pz+wz);
    tw.material = mat(scene,'twM',0.10,0.10,0.10);
  });

  const trail1 = MeshBuilder.CreateBox('bagTrail1', { width:280, height:50, depth:600 }, scene);
  trail1.position.set(px, gy+40, pz-550);
  trail1.material = mat(scene,'tr1M',0.72,0.68,0.62);

  const bagColors = [
    [0.85,0.12,0.12],[0.12,0.35,0.82],[0.12,0.72,0.18],[0.88,0.82,0.0],
    [0.45,0.08,0.65],[0.92,0.92,0.92],[0.65,0.35,0.12],[0.08,0.08,0.08]
  ];

  let bi = 0;
  for (let bx = -80; bx <= 80; bx += 80) {
    for (let bz = -220; bz <= 220; bz += 110) {
      const bc = bagColors[bi % bagColors.length];
      const bag = MeshBuilder.CreateBox('bag_'+bi, { width:70, height:65, depth:95 }, scene);
      bag.position.set(px+bx, gy+90, pz-550+bz);
      bag.material = mat(scene,'bagM_'+bi,...bc);
      bi++;
    }
  }
  for (let bx = -70; bx <= 70; bx += 70) {
    for (let bz = -150; bz <= 150; bz += 100) {
      const bc = bagColors[bi % bagColors.length];
      const b2 = MeshBuilder.CreateBox('bag2_'+bi, { width:65, height:60, depth:88 }, scene);
      b2.position.set(px+bx, gy+160, pz-550+bz);
      b2.material = mat(scene,'bag2M_'+bi,...bc);
      bi++;
    }
  }

  const trail2 = MeshBuilder.CreateBox('bagTrail2', { width:280, height:50, depth:600 }, scene);
  trail2.position.set(px, gy+40, pz-1220);
  trail2.material = mat(scene,'tr2M',0.72,0.68,0.62);

  for (let bx = -80; bx <= 80; bx += 80) {
    for (let bz = -200; bz <= 200; bz += 100) {
      const bc = bagColors[bi % bagColors.length];
      const b3 = MeshBuilder.CreateBox('bag3_'+bi, { width:68, height:62, depth:90 }, scene);
      b3.position.set(px+bx, gy+90, pz-1220+bz);
      b3.material = mat(scene,'bag3M_'+bi,...bc);
      bi++;
    }
  }

  const h1 = MeshBuilder.CreateBox('hitch1', { width:20, height:15, depth:250 }, scene);
  h1.position.set(px, gy+50, pz-325);
  h1.material = mat(scene,'hitchM',0.55,0.55,0.55);

  const h2 = MeshBuilder.CreateBox('hitch2', { width:20, height:15, depth:250 }, scene);
  h2.position.set(px, gy+50, pz-1000);
  h2.material = mat(scene,'hitch2M',0.55,0.55,0.55);

  [pz-550, pz-1220].forEach((trZ,ti) => {
    [[-130,220],[130,220],[-130,-220],[130,-220]].forEach(([wx,wz],i) => {
      const trw = MeshBuilder.CreateCylinder('trW_'+ti+i, { diameter:55, height:40, tessellation:10 }, scene);
      trw.rotation.z = Math.PI/2;
      trw.position.set(px+wx, gy+28, trZ+wz);
      trw.material = mat(scene,'trwM',0.10,0.10,0.10);
    });
  });

  buildWorker(scene, px+200, gy, pz-600, [0.88,0.72,0.0]);
  buildWorker(scene, px-200, gy, pz-700, [0.88,0.72,0.0]);
}

function buildFuelTruck(scene, ox, oz, gy) {
  const px = ox-400, pz = oz-900;

  const cab = MeshBuilder.CreateBox('fuelCab', { width:340, height:320, depth:480 }, scene);
  cab.position.set(px, gy+165, pz+500);
  cab.material = mat(scene,'fuelCabM',0.85,0.08,0.08);

  const fuelWS = MeshBuilder.CreateBox('fuelWS', { width:280, height:160, depth:18 }, scene);
  fuelWS.position.set(px, gy+220, pz+750);
  fuelWS.material = mat(scene,'fuelWSM',0.45,0.68,0.85,0.4,0.60);

  const grille = MeshBuilder.CreateBox('fuelGrille', { width:280, height:100, depth:15 }, scene);
  grille.position.set(px, gy+100, pz+755);
  grille.material = mat(scene,'fuelGM',0.18,0.18,0.18);

  [-100,100].forEach((hx,i) => {
    const hl = MeshBuilder.CreateBox('fuelHL_'+i, { width:55, height:45, depth:12 }, scene);
    hl.position.set(px+hx, gy+105, pz+758);
    hl.material = mat(scene,'fuelHLM',0.95,0.92,0.72,0.4);
  });

  const tank = MeshBuilder.CreateCylinder('fuelTank', { diameter:320, height:1800, tessellation:16 }, scene);
  tank.rotation.x = Math.PI/2;
  tank.position.set(px, gy+220, pz-200);
  tank.material = mat(scene,'tankM',0.82,0.08,0.08);

  [-900,900].forEach((tz,i) => {
    const cap = MeshBuilder.CreateCylinder('tankCap_'+i, {
      diameterBottom:320, diameterTop:280, height:60, tessellation:16
    }, scene);
    cap.rotation.x = Math.PI/2;
    cap.position.set(px, gy+220, pz-200+tz);
    cap.material = mat(scene,'tcM',0.75,0.06,0.06);
  });

  const jetSign = MeshBuilder.CreateBox('jetSign', { width:200, height:60, depth:8 }, scene);
  jetSign.position.set(px, gy+280, pz-200);
  jetSign.material = mat(scene,'jsM',0.92,0.92,0.92);

  const reel = MeshBuilder.CreateCylinder('fuelReel', { diameter:100, height:80, tessellation:12 }, scene);
  reel.position.set(px+200, gy+180, pz-100);
  reel.material = mat(scene,'reelM',0.25,0.25,0.28);

  const hose = MeshBuilder.CreateTorus('fuelHose', { diameter:100, thickness:18, tessellation:16 }, scene);
  hose.position.set(px+200, gy+180, pz-100);
  hose.material = mat(scene,'hoseM',0.12,0.45,0.12);

  for (let s = 0; s < 4; s++) {
    const step = MeshBuilder.CreateBox('fuelStep_'+s, { width:80, height:12, depth:18 }, scene);
    step.position.set(px-175, gy+70+s*55, pz+200);
    step.material = mat(scene,'stepM',0.55,0.55,0.55);
  }

  const chassis = MeshBuilder.CreateBox('fuelChassis', { width:340, height:50, depth:2400 }, scene);
  chassis.position.set(px, gy+50, pz-100);
  chassis.material = mat(scene,'chassM',0.20,0.20,0.22);

  [[-175,gy+65,pz+620],[175,gy+65,pz+620],
   [-175,gy+65,pz-400],[175,gy+65,pz-400],
   [-175,gy+65,pz-700],[175,gy+65,pz-700]].forEach(([wx,wy,wz],i) => {
    const tw = MeshBuilder.CreateCylinder('fuelW_'+i, { diameter:110, height:55, tessellation:12 }, scene);
    tw.rotation.z = Math.PI/2;
    tw.position.set(wx, wy, wz);
    tw.material = mat(scene,'fwM',0.10,0.10,0.10);

    const hub = MeshBuilder.CreateCylinder('fuelHub_'+i, { diameter:55, height:56, tessellation:10 }, scene);
    hub.rotation.z = Math.PI/2;
    hub.position.set(wx, wy, wz);
    hub.material = mat(scene,'fhM',0.55,0.52,0.48);
  });

  [-250,250].forEach((cx) => {
    buildCone(scene, px+cx, gy, pz+850);
    buildCone(scene, px+cx, gy, pz-1100);
  });

  buildWorker(scene, px+350, gy, pz+300, [0.92,0.40,0.0]);
}

function buildFireTruck(scene, ox, oz, gy) {
  const px = ox+200, pz = oz-1100;

  const body = MeshBuilder.CreateBox('fireTruck', { width:380, height:350, depth:1200 }, scene);
  body.position.set(px, gy+180, pz);
  body.material = mat(scene,'ftM',0.88,0.35,0.0);

  const ftCab = MeshBuilder.CreateBox('ftCab', { width:380, height:380, depth:500 }, scene);
  ftCab.position.set(px, gy+200, pz+500);
  ftCab.material = mat(scene,'ftCabM',0.88,0.08,0.08);

  const ftWS = MeshBuilder.CreateBox('ftWS', { width:300, height:180, depth:15 }, scene);
  ftWS.position.set(px, gy+275, pz+755);
  ftWS.material = mat(scene,'ftWSM',0.45,0.68,0.85,0.3,0.65);

  const cannon = MeshBuilder.CreateCylinder('cannon', { diameter:55, height:250, tessellation:8 }, scene);
  cannon.position.set(px, gy+540, pz+100);
  cannon.material = mat(scene,'canM',0.72,0.72,0.72);

  const nozzle = MeshBuilder.CreateCylinder('nozzle', {
    diameterBottom:55, diameterTop:28, height:120, tessellation:8
  }, scene);
  nozzle.rotation.x = -0.5;
  nozzle.position.set(px, gy+610, pz+100);
  nozzle.material = mat(scene,'nozM',0.55,0.55,0.58);

  const lightBar = MeshBuilder.CreateBox('ftLBar', { width:350, height:40, depth:180 }, scene);
  lightBar.position.set(px, gy+400, pz+400);
  lightBar.material = mat(scene,'lbM',0.12,0.12,0.14);

  for (let l = 0; l < 6; l++) {
    const fl = MeshBuilder.CreateBox('flt_'+l, { width:38, height:28, depth:28 }, scene);
    fl.position.set(px-150+l*60, gy+425, pz+400);
    const flm = mat(scene,'fltM'+l, l%2===0?0.9:0.1, 0.05, l%2===0?0.1:0.9, 0.4);
    flm.emissiveColor = new Color3(l%2===0?0.5:0.05, 0.0, l%2===0?0.05:0.5);
    fl.material = flm;
  }

  [[-200,pz+450],[200,pz+450],[-200,pz-300],[200,pz-300]].forEach(([wx,wz],i) => {
    const w = MeshBuilder.CreateCylinder('ftW_'+i, { diameter:160, height:80, tessellation:14 }, scene);
    w.rotation.z = Math.PI/2;
    w.position.set(wx, gy+80, wz);
    w.material = mat(scene,'ftwM',0.10,0.10,0.10);
  });
}

function buildParking(scene, terrain, ox, oz, gy) {
  const lot = MeshBuilder.CreateBox('parking_lot', { width:2200, height:5, depth:1000 }, scene);
  lot.position.set(ox-1500, gy+2.5, oz-2400);
  lot.material = mat(scene,'lotM',0.22,0.22,0.23);

  for (let row = 0; row < 2; row++) {
    for (let bay = 0; bay < 16; bay++) {
      const line = MeshBuilder.CreateBox('pLine_'+row+bay, { width:10, height:6, depth:380 }, scene);
      line.position.set(ox-2500+bay*140, gy+4, oz-2150+row*550);
      line.material = mat(scene,'pLM',0.88,0.88,0.88);
    }
  }

  const carColors = [
    [0.08,0.08,0.08],[0.88,0.88,0.88],[0.82,0.06,0.06],[0.06,0.25,0.72],
    [0.88,0.82,0.0],[0.08,0.45,0.15],[0.55,0.28,0.08],[0.92,0.60,0.0],
    [0.65,0.65,0.68],[0.92,0.72,0.72]
  ];

  for (let row = 0; row < 2; row++) {
    for (let bay = 0; bay < 14; bay++) {
      if (Math.random() > 0.25) {
        const cc = carColors[(row*14+bay) % carColors.length];
        buildParkedCar(scene, ox-2430+bay*140, gy, oz-2150+row*550, cc);
      }
    }
  }

  const booth = MeshBuilder.CreateBox('parkBooth', { width:200, height:300, depth:220 }, scene);
  booth.position.set(ox-2700, gy+150, oz-2000);
  booth.material = mat(scene,'pbthM',0.88,0.86,0.80);

  const boothRoof = MeshBuilder.CreateBox('boothRoof', { width:240, height:30, depth:260 }, scene);
  boothRoof.position.set(ox-2700, gy+315, oz-2000);
  boothRoof.material = mat(scene,'bthRM',0.20,0.40,0.65);

  const gate = MeshBuilder.CreateBox('boomGate', { width:550, height:18, depth:18 }, scene);
  gate.position.set(ox-2400, gy+220, oz-2000);
  gate.material = mat(scene,'bgM',0.85,0.08,0.08);

  [-2600,-800].forEach((xo,i) => {
    const pSign = MeshBuilder.CreateBox('pSign_'+i, { width:80, height:120, depth:12 }, scene);
    pSign.position.set(ox+xo, gy+250, oz-1950);
    pSign.material = mat(scene,'psM',0.10,0.18,0.75);

    const pPole = MeshBuilder.CreateCylinder('pPole_'+i, { diameter:14, height:240, tessellation:6 }, scene);
    pPole.position.set(ox+xo, gy+120, oz-1950);
    pPole.material = mat(scene,'ppM',0.65,0.65,0.65);
  });

  for (let sl = 0; sl < 4; sl++) {
    const slPole = MeshBuilder.CreateCylinder('slPole_'+sl, { diameter:20, height:550, tessellation:8 }, scene);
    slPole.position.set(ox-2400+sl*700, gy+275, oz-2400);
    slPole.material = mat(scene,'slpM',0.70,0.70,0.70);

    const slHead = MeshBuilder.CreateBox('slHead_'+sl, { width:100, height:28, depth:45 }, scene);
    slHead.position.set(ox-2400+sl*700, gy+568, oz-2400);
    const slm = mat(scene,'slhM',0.95,0.92,0.72,0.4);
    slm.emissiveColor = new Color3(0.25,0.22,0.08);
    slHead.material = slm;
  }
}

function buildParkedCar(scene, px, gy, pz, color) {
  const id = px+'_'+pz;
  const body = MeshBuilder.CreateBox('car_'+id, { width:195, height:140, depth:420 }, scene);
  body.position.set(px, gy+75, pz);
  body.material = mat(scene,'carM_'+id,...color,0.35);

  const roof = MeshBuilder.CreateBox('carR_'+id, { width:180, height:85, depth:230 }, scene);
  roof.position.set(px, gy+190, pz-30);
  roof.material = mat(scene,'carRM_'+id,...color,0.3);

  const ws = MeshBuilder.CreateBox('carWS_'+id, { width:165, height:70, depth:12 }, scene);
  ws.position.set(px, gy+175, pz+115);
  ws.material = mat(scene,'cwsM',0.45,0.65,0.82,0.3,0.55);

  [[-95,145],[95,145],[-95,-145],[95,-145]].forEach(([wx,wz],i) => {
    const w = MeshBuilder.CreateCylinder('cW_'+id+i, { diameter:65, height:38, tessellation:10 }, scene);
    w.rotation.z = Math.PI/2;
    w.position.set(px+wx, gy+33, pz+wz);
    w.material = mat(scene,'cwM_'+i,0.10,0.10,0.10);
  });
}

function buildWorker(scene, px, gy, pz, vestColor) {
  const id = px+'_'+pz;
  const body = MeshBuilder.CreateCylinder('wBody_'+id, { diameter:45, height:120, tessellation:8 }, scene);
  body.position.set(px, gy+90, pz);
  body.material = mat(scene,'wBM',...vestColor);

  const head = MeshBuilder.CreateSphere('wHead_'+id, { diameter:48, segments:6 }, scene);
  head.position.set(px, gy+185, pz);
  head.material = mat(scene,'wHM',0.72,0.52,0.38);

  const hat = MeshBuilder.CreateCylinder('wHat_'+id, { diameter:58, height:28, tessellation:10 }, scene);
  hat.position.set(px, gy+215, pz);
  hat.material = mat(scene,'wHtM',0.92,0.82,0.0);

  [-12,12].forEach((lx,li) => {
    const leg = MeshBuilder.CreateCylinder('wLeg_'+id+li, { diameter:20, height:100, tessellation:6 }, scene);
    leg.position.set(px+lx, gy+30, pz);
    leg.material = mat(scene,'wLM',0.22,0.22,0.25);
  });
}

function buildCone(scene, px, gy, pz) {
  const id = px+'_'+pz;
  const cone = MeshBuilder.CreateCylinder('cone_'+id, {
    diameterBottom:60, diameterTop:0, height:100, tessellation:8
  }, scene);
  cone.position.set(px, gy+50, pz);
  cone.material = mat(scene,'coneM',0.92,0.42,0.0);

  const base = MeshBuilder.CreateBox('coneBase_'+id, { width:70, height:12, depth:70 }, scene);
  base.position.set(px, gy+6, pz);
  base.material = mat(scene,'coneBM',0.12,0.12,0.12);
}

function buildPerimeterFence(scene, ox, oz, gy) {
  const segs = [
    { ax:ox-3200, az:oz-3000, bx:ox+800, bz:oz-3000 },
    { ax:ox-3200, az:oz+3500, bx:ox+800, bz:oz+3500 },
    { ax:ox-3200, az:oz-3000, bx:ox-3200, bz:oz+3500 },
    { ax:ox+800,  az:oz-3000, bx:ox+800,  bz:oz+3500 },
  ];
  const fenceMat = mat(scene,'fenceM',0.65,0.65,0.62,0.2);

  segs.forEach((seg,si) => {
    const dx=seg.bx-seg.ax, dz=seg.bz-seg.az;
    const len=Math.sqrt(dx*dx+dz*dz);
    const numPosts=Math.floor(len/280);
    for (let p=0; p<=numPosts; p++) {
      const t=p/numPosts;
      const post=MeshBuilder.CreateCylinder('fPost_'+si+p, { diameter:22, height:280, tessellation:6 }, scene);
      post.position.set(seg.ax+dx*t, gy+140, seg.az+dz*t);
      post.material=fenceMat;
    }
    for (let w=0; w<4; w++) {
      const wire=MeshBuilder.CreateBox('wire_'+si+w, {
        width: si<2?len:14, height:8, depth: si<2?14:len
      }, scene);
      wire.position.set((seg.ax+seg.bx)/2, gy+50+w*65, (seg.az+seg.bz)/2);
      wire.material=fenceMat;
    }
  });

  const gateL=MeshBuilder.CreateBox('secGateL', { width:250, height:280, depth:18 }, scene);
  gateL.position.set(ox-1600, gy+140, oz-3000);
  gateL.material=mat(scene,'sgM',0.62,0.62,0.60,0.2);

  const gateR=MeshBuilder.CreateBox('secGateR', { width:250, height:280, depth:18 }, scene);
  gateR.position.set(ox-1200, gy+140, oz-3000);
  gateR.material=mat(scene,'sgRM',0.62,0.62,0.60,0.2);

  const gBooth=MeshBuilder.CreateBox('gBooth', { width:200, height:280, depth:200 }, scene);
  gBooth.position.set(ox-1000, gy+140, oz-2950);
  gBooth.material=mat(scene,'gbM',0.88,0.86,0.80);
}

function buildWindsock(scene, ox, oz, gy) {
  [oz-4500, oz+2800].forEach((wz,wi) => {
    const pole=MeshBuilder.CreateCylinder('wsPole_'+wi, { diameter:18, height:600, tessellation:6 }, scene);
    pole.position.set(ox+300, gy+300, wz);
    pole.material=mat(scene,'wspM',0.78,0.78,0.78);

    for (let b=0; b<6; b++) {
      const band=MeshBuilder.CreateCylinder('wsBand_'+wi+b, {
        diameterBottom: b===0?70:70-b*8,
        diameterTop: b===5?20:70-(b+1)*8,
        height:80, tessellation:10
      }, scene);
      band.rotation.x=Math.PI/2;
      band.position.set(ox+310+b*60, gy+595, wz);
      band.material=mat(scene,'wsB_'+wi+b,
        b%2===0?0.88:0.92, b%2===0?0.42:0.92, b%2===0?0.0:0.92);
    }
  });
}

function buildApronLights(scene, ox, oz, gy) {
  for (let l=0; l<20; l++) {
    [-620,620].forEach((xo,side) => {
      const bl=MeshBuilder.CreateBox('taxiLtB_'+l+side, { width:18, height:14, depth:18 }, scene);
      bl.position.set(ox+xo-600, gy+8, oz-3800+l*380);
      const blm=mat(scene,'blM',0.25,0.35,0.92,0.3);
      blm.emissiveColor=new Color3(0.08,0.12,0.55);
      bl.material=blm;
    });
  }

  for (let g=0; g<10; g++) {
    const gl=MeshBuilder.CreateBox('threshGreen_'+g, { width:16, height:12, depth:16 }, scene);
    gl.position.set(ox-180+g*40, gy+8, oz-4200);
    const glm=mat(scene,'glM',0.12,0.88,0.18,0.3);
    glm.emissiveColor=new Color3(0.04,0.42,0.06);
    gl.material=glm;
  }

  for (let r=0; r<8; r++) {
    const rl=MeshBuilder.CreateBox('stopRed_'+r, { width:16, height:12, depth:16 }, scene);
    rl.position.set(ox-190+r*55, gy+8, oz-2600);
    const rlm=mat(scene,'rlM',0.92,0.08,0.08,0.4);
    rlm.emissiveColor=new Color3(0.55,0.02,0.02);
    rl.material=rlm;
  }
}