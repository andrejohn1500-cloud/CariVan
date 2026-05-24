import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

function mat(scene, name, r, g, b, sr, sg, sb, alpha) {
  const m = new StandardMaterial(name + '_' + Math.random().toString(36).slice(2), scene);
  m.diffuseColor  = new Color3(r, g, b);
  m.specularColor = new Color3(sr ?? 0.3, sg ?? 0.3, sb ?? 0.3);
  if (alpha !== undefined) m.alpha = alpha;
  return m;
}

// ── YOUR 2008 JDM Honda Civic FD — PX842 ─────────────────────────
// Jet black, yellow rims, rear spoiler, twin exhaust, red H badge
export function buildCivic(scene, position) {
  const BLACK  = [0.04, 0.04, 0.04];
  const DARK   = [0.03, 0.03, 0.05];
  const YELLOW = [0.82, 0.72, 0.0];   // JDM yellow rims
  const RED    = [0.78, 0.05, 0.05];
  const CHROME = [0.75, 0.75, 0.75];

  // ── BODY ──
  const body = MeshBuilder.CreateBox('civ_body', {
    width: 1.78, height: 1.38, depth: 4.45
  }, scene);
  body.position = position.clone();
  body.position.y += 0.80;
  body.material = mat(scene, 'cB', ...BLACK, 0.6, 0.6, 0.65);

  // ── ROOF (lower sporty sedan) ──
  const roof = MeshBuilder.CreateBox('civ_roof', {
    width: 1.65, height: 0.55, depth: 2.05
  }, scene);
  roof.parent = body;
  roof.position.set(0, 0.88, -0.15);
  roof.material = mat(scene, 'cR', ...BLACK, 0.5, 0.5, 0.55);

  // ── GLASS MAT (reused) ──
  const gm = mat(scene, 'cG', ...DARK, 0.5, 0.6, 0.7, 0.80);

  // Front windshield (raked)
  const fws = MeshBuilder.CreateBox('civ_fws', { width: 1.55, height: 0.70, depth: 0.07 }, scene);
  fws.parent = body; fws.position.set(0, 0.60, 1.82); fws.rotation.x = -0.44;
  fws.material = gm;

  // Rear windshield
  const rws = MeshBuilder.CreateBox('civ_rws', { width: 1.50, height: 0.60, depth: 0.07 }, scene);
  rws.parent = body; rws.position.set(0, 0.55, -1.80); rws.rotation.x = 0.40;
  rws.material = gm;

  // Side windows (tinted black)
  [-0.90, 0.90].forEach((x, si) => {
    [0.55, -0.28, -1.08].forEach((z, wi) => {
      const w = MeshBuilder.CreateBox('cW_' + si + wi, { width: 0.06, height: 0.40, depth: 0.60 }, scene);
      w.parent = body; w.position.set(x, 0.70, z);
      w.material = gm;
    });
  });

  // ── BONNET/HOOD (flat, slightly raised at front) ──
  const hood = MeshBuilder.CreateBox('civ_hood', { width: 1.72, height: 0.08, depth: 1.65 }, scene);
  hood.parent = body; hood.position.set(0, 0.70, 1.2);
  hood.material = mat(scene, 'cHd', ...BLACK, 0.65, 0.65, 0.7);

  // ── FRONT GRILLE (8th gen Civic wide horizontal) ──
  const grille = MeshBuilder.CreateBox('civ_grille', { width: 1.55, height: 0.16, depth: 0.09 }, scene);
  grille.parent = body; grille.position.set(0, -0.20, 2.26);
  grille.material = mat(scene, 'cGr', 0.15, 0.15, 0.15, 0.3, 0.3, 0.3);

  // Chrome grille bar
  const gBar = MeshBuilder.CreateBox('civ_gbar', { width: 1.50, height: 0.04, depth: 0.10 }, scene);
  gBar.parent = body; gBar.position.set(0, -0.15, 2.27);
  gBar.material = mat(scene, 'cGB', ...CHROME, 0.8, 0.8, 0.8);

  // Red Honda H badge (centre grille)
  const hBadge = MeshBuilder.CreateBox('civ_h', { width: 0.22, height: 0.18, depth: 0.06 }, scene);
  hBadge.parent = body; hBadge.position.set(0, -0.14, 2.28);
  hBadge.material = mat(scene, 'hB', 0.82, 0.04, 0.04, 0.5, 0.1, 0.1);

  // ── HEADLIGHTS (projector, round-ish 8th gen style) ──
  [-0.62, 0.62].forEach((x, i) => {
    const hl = MeshBuilder.CreateBox('cHL_' + i, { width: 0.52, height: 0.30, depth: 0.08 }, scene);
    hl.parent = body; hl.position.set(x, -0.05, 2.25);
    hl.material = mat(scene, 'chl' + i, 0.88, 0.88, 0.80, 0.5, 0.5, 0.4);
    hl.material.emissiveColor = new Color3(0.15, 0.15, 0.08);
  });

  // Yellow fog lights (lower bumper)
  [-0.50, 0.50].forEach((x, i) => {
    const fog = MeshBuilder.CreateBox('cfog_' + i, { width: 0.25, height: 0.16, depth: 0.08 }, scene);
    fog.parent = body; fog.position.set(x, -0.60, 2.22);
    fog.material = mat(scene, 'cfM' + i, 0.90, 0.82, 0.0, 0.6, 0.55, 0.0);
    fog.material.emissiveColor = new Color3(0.35, 0.30, 0.0);
  });

  // ── FRONT BUMPER ──
  const fbump = MeshBuilder.CreateBox('civ_fb', { width: 1.78, height: 0.30, depth: 0.24 }, scene);
  fbump.parent = body; fbump.position.set(0, -0.60, 2.25);
  fbump.material = mat(scene, 'cfb', 0.06, 0.06, 0.06, 0.1, 0.1, 0.1);

  // Front lip
  const lip = MeshBuilder.CreateBox('civ_lip', { width: 1.65, height: 0.08, depth: 0.18 }, scene);
  lip.parent = body; lip.position.set(0, -0.76, 2.30);
  lip.material = mat(scene, 'clp', 0.05, 0.05, 0.05, 0.1, 0.1, 0.1);

  // Front plate PX842
  const fplate = MeshBuilder.CreateBox('civ_fp', { width: 0.52, height: 0.16, depth: 0.05 }, scene);
  fplate.parent = body; fplate.position.set(0, -0.50, 2.30);
  fplate.material = mat(scene, 'fpm', 0.92, 0.92, 0.0); // yellow Vincy plate

  // ── REAR BOOT + SPOILER ──
  const trunk = MeshBuilder.CreateBox('civ_trunk', { width: 1.72, height: 0.30, depth: 0.80 }, scene);
  trunk.parent = body; trunk.position.set(0, 0.28, -2.05);
  trunk.material = mat(scene, 'cTk', ...BLACK, 0.55, 0.55, 0.60);

  // Rear spoiler (lip style)
  const spoiler = MeshBuilder.CreateBox('civ_spoiler', { width: 1.60, height: 0.14, depth: 0.32 }, scene);
  spoiler.parent = body; spoiler.position.set(0, 0.56, -2.0);
  spoiler.material = mat(scene, 'cSp', ...BLACK, 0.4, 0.4, 0.45);

  // Spoiler uprights
  [-0.65, 0.65].forEach((x, i) => {
    const up = MeshBuilder.CreateBox('spu_' + i, { width: 0.08, height: 0.16, depth: 0.12 }, scene);
    up.parent = body; up.position.set(x, 0.50, -1.98);
    up.material = mat(scene, 'spuM', ...BLACK, 0.3, 0.3, 0.35);
  });

  // ── TAIL LIGHTS (8th gen — oval/round, red) ──
  [-0.60, 0.60].forEach((x, i) => {
    // Outer large section
    const tl = MeshBuilder.CreateBox('cTL_' + i, { width: 0.40, height: 0.38, depth: 0.07 }, scene);
    tl.parent = body; tl.position.set(x, 0.10, -2.24);
    tl.material = mat(scene, 'ctlM' + i, 0.85, 0.08, 0.08, 0.3, 0.05, 0.05);
    tl.material.emissiveColor = new Color3(0.18, 0.0, 0.0);
  });

  // Rear plate PX842
  const rplate = MeshBuilder.CreateBox('civ_rp', { width: 0.52, height: 0.16, depth: 0.05 }, scene);
  rplate.parent = body; rplate.position.set(0, -0.12, -2.26);
  rplate.material = mat(scene, 'rpm', 0.92, 0.92, 0.0);

  // ── TWIN EXHAUST TIPS ──
  [-0.28, 0.28].forEach((x, i) => {
    const ex = MeshBuilder.CreateCylinder('cEx_' + i, { diameter: 0.12, height: 0.18, tessellation: 10 }, scene);
    ex.parent = body; ex.rotation.x = Math.PI / 2;
    ex.position.set(x, -0.72, -2.28);
    ex.material = mat(scene, 'exM' + i, ...CHROME, 0.8, 0.8, 0.8);
  });

  // ── REAR BUMPER ──
  const rbump = MeshBuilder.CreateBox('civ_rb', { width: 1.78, height: 0.26, depth: 0.22 }, scene);
  rbump.parent = body; rbump.position.set(0, -0.60, -2.26);
  rbump.material = mat(scene, 'crb', 0.06, 0.06, 0.06, 0.1, 0.1, 0.1);

  // ── SIDE MIRRORS (black) ──
  [-0.92, 0.92].forEach((x, i) => {
    const mir = MeshBuilder.CreateBox('cMir_' + i, { width: 0.10, height: 0.14, depth: 0.22 }, scene);
    mir.parent = body; mir.position.set(x, 0.36, 1.55);
    mir.material = mat(scene, 'cmM' + i, ...BLACK, 0.2, 0.2, 0.2);
  });

  // ── SIDE SKIRTS ──
  [-0.90, 0.90].forEach((x, i) => {
    const sk = MeshBuilder.CreateBox('csk_' + i, { width: 0.07, height: 0.18, depth: 3.8 }, scene);
    sk.parent = body; sk.position.set(x, -0.65, 0);
    sk.material = mat(scene, 'cskM', ...BLACK, 0.1, 0.1, 0.1);
  });

  // ── WHEELS — black tyres + YELLOW JDM rims ──
  const wPos = [
    new Vector3(-0.95, -0.60, 1.45),
    new Vector3( 0.95, -0.60, 1.45),
    new Vector3(-0.95, -0.60, -1.45),
    new Vector3( 0.95, -0.60, -1.45)
  ];
  const wheels = wPos.map((pos, i) => {
    const w = MeshBuilder.CreateCylinder('cW_' + i, { diameter: 0.70, height: 0.33, tessellation: 18 }, scene);
    w.rotation.z = Math.PI / 2; w.parent = body; w.position = pos;
    w.material = mat(scene, 'cwm' + i, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05);

    // Yellow JDM rim
    const rim = MeshBuilder.CreateCylinder('cRim_' + i, { diameter: 0.46, height: 0.34, tessellation: 16 }, scene);
    rim.rotation.z = Math.PI / 2; rim.parent = body; rim.position = pos;
    rim.material = mat(scene, 'cRm' + i, ...YELLOW, 0.7, 0.65, 0.0);

    // Spokes (10-spoke JDM style)
    for (let s = 0; s < 10; s++) {
      const spk = MeshBuilder.CreateBox('spk_' + i + '_' + s, { width: 0.035, height: 0.35, depth: 0.12 }, scene);
      spk.rotation.z = Math.PI / 2;
      spk.rotation.x = (s / 10) * Math.PI * 2;
      spk.parent = body; spk.position = pos;
      spk.material = mat(scene, 'spkM' + i + s, ...YELLOW, 0.6, 0.55, 0.0);
    }
    return w;
  });

  return { mesh: body, wheels };
}

// ── WIFE'S 2019 Honda Fit Hybrid — PAB699 ────────────────────────
// Pearl silver/ice blue, black rims, wide tail lights, big rear glass
export function buildFitHybrid(scene, position) {
  const SILVER = [0.82, 0.86, 0.90]; // ice silver/pearl
  const DARK   = [0.03, 0.03, 0.05];
  const BLACK  = [0.07, 0.07, 0.07];
  const RED    = [0.80, 0.06, 0.06];
  const CHROME = [0.78, 0.78, 0.78];

  // ── BODY ──
  const body = MeshBuilder.CreateBox('fit_body', { width: 1.69, height: 1.50, depth: 3.90 }, scene);
  body.position = position.clone();
  body.position.y += 0.86;
  body.material = mat(scene, 'fB', ...SILVER, 0.5, 0.52, 0.55);

  // ── ROOF ──
  const roof = MeshBuilder.CreateBox('fit_roof', { width: 1.58, height: 0.10, depth: 2.45 }, scene);
  roof.parent = body; roof.position.set(0, 0.80, -0.20);
  roof.material = mat(scene, 'fR', ...SILVER, 0.45, 0.47, 0.50);

  const gm = mat(scene, 'fG', ...DARK, 0.55, 0.65, 0.72, 0.82);

  // Front windshield (upright Fit style)
  const fws = MeshBuilder.CreateBox('fit_fws', { width: 1.50, height: 0.75, depth: 0.07 }, scene);
  fws.parent = body; fws.position.set(0, 0.52, 1.68); fws.rotation.x = -0.28;
  fws.material = gm;

  // Big rear hatch glass (Fit's signature)
  const rws = MeshBuilder.CreateBox('fit_rws', { width: 1.42, height: 0.80, depth: 0.07 }, scene);
  rws.parent = body; rws.position.set(0, 0.40, -1.92); rws.rotation.x = 0.16;
  rws.material = gm;

  // Side windows
  [-0.86, 0.86].forEach((x, si) => {
    [[0.44, 0.62], [-0.28, 0.62], [-1.02, 0.36]].forEach(([z, ww], wi) => {
      const w = MeshBuilder.CreateBox('fW_' + si + wi, { width: 0.06, height: 0.44, depth: ww }, scene);
      w.parent = body; w.position.set(x, 0.60, z);
      w.material = gm;
    });
  });

  // ── FRONT BUMPER (sporty modern Fit) ──
  const fbump = MeshBuilder.CreateBox('fit_fb', { width: 1.69, height: 0.34, depth: 0.24 }, scene);
  fbump.parent = body; fbump.position.set(0, -0.63, 2.0);
  fbump.material = mat(scene, 'ffb', 0.08, 0.08, 0.08, 0.12, 0.12, 0.12);

  // Lower bumper chrome strip
  const bStrip = MeshBuilder.CreateBox('fit_bstrip', { width: 1.40, height: 0.04, depth: 0.10 }, scene);
  bStrip.parent = body; bStrip.position.set(0, -0.50, 2.06);
  bStrip.material = mat(scene, 'fbs', ...CHROME, 0.7, 0.7, 0.7);

  // ── HEADLIGHTS (sharp angular LED) ──
  [-0.58, 0.58].forEach((x, i) => {
    const hl = MeshBuilder.CreateBox('fHL_' + i, { width: 0.50, height: 0.24, depth: 0.07 }, scene);
    hl.parent = body; hl.position.set(x, -0.10, 2.0);
    hl.material = mat(scene, 'fhl' + i, 0.92, 0.92, 0.85, 0.5, 0.5, 0.4);
    hl.material.emissiveColor = new Color3(0.20, 0.20, 0.12);

    // LED DRL line
    const drl = MeshBuilder.CreateBox('fDRL_' + i, { width: 0.44, height: 0.04, depth: 0.08 }, scene);
    drl.parent = body; drl.position.set(x, 0.04, 2.01);
    drl.material = mat(scene, 'fdrl' + i, 0.95, 0.95, 0.78, 0.7, 0.7, 0.55);
    drl.material.emissiveColor = new Color3(0.38, 0.38, 0.22);
  });

  // Honda grille (wide, body-coloured with chrome H)
  const grille = MeshBuilder.CreateBox('fit_gr', { width: 1.40, height: 0.20, depth: 0.09 }, scene);
  grille.parent = body; grille.position.set(0, -0.34, 2.0);
  grille.material = mat(scene, 'fgr', ...SILVER, 0.4, 0.42, 0.45);

  // Chrome H badge
  const hB = MeshBuilder.CreateBox('fit_hb', { width: 0.20, height: 0.16, depth: 0.06 }, scene);
  hB.parent = body; hB.position.set(0, -0.24, 2.02);
  hB.material = mat(scene, 'fhB', ...CHROME, 0.8, 0.8, 0.8);

  // Plate PAB699
  const fplate = MeshBuilder.CreateBox('fit_fp', { width: 0.48, height: 0.15, depth: 0.05 }, scene);
  fplate.parent = body; fplate.position.set(0, -0.52, 2.02);
  fplate.material = mat(scene, 'ffpm', 0.04, 0.04, 0.04); // black plate

  // ── SIDE MIRRORS (silver) ──
  [-0.88, 0.88].forEach((x, i) => {
    const mir = MeshBuilder.CreateBox('fMir_' + i, { width: 0.09, height: 0.14, depth: 0.20 }, scene);
    mir.parent = body; mir.position.set(x, 0.34, 1.4);
    mir.material = mat(scene, 'fmM' + i, ...SILVER, 0.45, 0.47, 0.50);
  });

  // ── REAR HATCH ──
  // Hatch lip spoiler
  const hatch = MeshBuilder.CreateBox('fit_hatch', { width: 1.60, height: 0.12, depth: 0.15 }, scene);
  hatch.parent = body; hatch.position.set(0, 0.76, -1.95);
  hatch.material = mat(scene, 'fhtch', 0.06, 0.06, 0.06, 0.2, 0.2, 0.2);

  // Honda H rear badge
  const rH = MeshBuilder.CreateBox('fit_rh', { width: 0.18, height: 0.14, depth: 0.05 }, scene);
  rH.parent = body; rH.position.set(0, 0.28, -1.97);
  rH.material = mat(scene, 'frH', ...CHROME, 0.8, 0.8, 0.8);

  // FIT lettering bar
  const fitBadge = MeshBuilder.CreateBox('fit_badge', { width: 0.40, height: 0.08, depth: 0.05 }, scene);
  fitBadge.parent = body; fitBadge.position.set(-0.28, 0.20, -1.97);
  fitBadge.material = mat(scene, 'fbdg', ...CHROME, 0.7, 0.7, 0.7);

  // ── TAIL LIGHTS (wide, modern — wrap around) ──
  [-0.58, 0.58].forEach((x, i) => {
    // Main section
    const tl = MeshBuilder.CreateBox('fTL_' + i, { width: 0.50, height: 0.22, depth: 0.07 }, scene);
    tl.parent = body; tl.position.set(x, 0.14, -1.97);
    tl.material = mat(scene, 'ftlM' + i, ...RED, 0.3, 0.05, 0.05);
    tl.material.emissiveColor = new Color3(0.16, 0.0, 0.0);

    // Lower accent (red strip)
    const tla = MeshBuilder.CreateBox('fTLa_' + i, { width: 0.50, height: 0.07, depth: 0.08 }, scene);
    tla.parent = body; tla.position.set(x, -0.02, -1.96);
    tla.material = mat(scene, 'ftlaM' + i, 0.60, 0.04, 0.04, 0.2, 0.02, 0.02);
  });

  // Plate PAB699
  const rplate = MeshBuilder.CreateBox('fit_rp', { width: 0.48, height: 0.15, depth: 0.05 }, scene);
  rplate.parent = body; rplate.position.set(0, -0.08, -1.97);
  rplate.material = mat(scene, 'frpm', 0.04, 0.04, 0.04);

  // ── REAR BUMPER ──
  const rbump = MeshBuilder.CreateBox('fit_rb', { width: 1.69, height: 0.28, depth: 0.22 }, scene);
  rbump.parent = body; rbump.position.set(0, -0.62, -1.97);
  rbump.material = mat(scene, 'frb', 0.08, 0.08, 0.08, 0.1, 0.1, 0.1);

  // Lower diffuser strip
  const diff = MeshBuilder.CreateBox('fit_diff', { width: 1.30, height: 0.07, depth: 0.18 }, scene);
  diff.parent = body; diff.position.set(0, -0.75, -2.0);
  diff.material = mat(scene, 'fdif', 0.06, 0.06, 0.06, 0.1, 0.1, 0.1);

  // ── WHEELS — black rims (stock Fit style) ──
  const wPos = [
    new Vector3(-0.90, -0.60, 1.32),
    new Vector3( 0.90, -0.60, 1.32),
    new Vector3(-0.90, -0.60, -1.32),
    new Vector3( 0.90, -0.60, -1.32)
  ];
  const wheels = wPos.map((pos, i) => {
    const w = MeshBuilder.CreateCylinder('fW_' + i, { diameter: 0.66, height: 0.28, tessellation: 18 }, scene);
    w.rotation.z = Math.PI / 2; w.parent = body; w.position = pos;
    w.material = mat(scene, 'fwm' + i, 0.07, 0.07, 0.07, 0.05, 0.05, 0.05);

    // Dark gunmetal/black alloy
    const rim = MeshBuilder.CreateCylinder('fRim_' + i, { diameter: 0.42, height: 0.29, tessellation: 16 }, scene);
    rim.rotation.z = Math.PI / 2; rim.parent = body; rim.position = pos;
    rim.material = mat(scene, 'frm' + i, 0.18, 0.18, 0.20, 0.4, 0.4, 0.42);

    // 5-spoke pattern
    for (let s = 0; s < 5; s++) {
      const spk = MeshBuilder.CreateBox('fspk_' + i + s, { width: 0.04, height: 0.29, depth: 0.10 }, scene);
      spk.rotation.z = Math.PI / 2;
      spk.rotation.x = (s / 5) * Math.PI * 2;
      spk.parent = body; spk.position = pos;
      spk.material = mat(scene, 'fspkM' + i + s, 0.22, 0.22, 0.24, 0.4, 0.4, 0.42);
    }
    return w;
  });

  return { mesh: body, wheels };
}