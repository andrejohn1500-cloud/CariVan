import {
  MeshBuilder, StandardMaterial, Color3,
  Animation, Vector3, DynamicTexture
} from '@babylonjs/core';

export function buildOcean(scene) {

  // ── Main deep ocean ───────────────────────────────────────────────────────
  const ocean = MeshBuilder.CreateGround('ocean', {
    width: 120000, height: 120000, subdivisions: 12
  }, scene);
  ocean.position.y = -800;

  const SIZE = 512;
  const tex  = new DynamicTexture('oceanTex', SIZE, scene, false);
  const ctx  = tex.getContext();

  // Deep Caribbean gradient
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0.00, '#061d35');
  g.addColorStop(0.20, '#0a2e52');
  g.addColorStop(0.40, '#0d4272');
  g.addColorStop(0.60, '#0e5a8a');
  g.addColorStop(0.80, '#1572a8');
  g.addColorStop(1.00, '#2090c0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Deep shimmer patches
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE;
    const r  = 20 + Math.random() * 80;
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0,   `rgba(30,120,180,0.18)`);
    gr.addColorStop(1,   `rgba(0,0,0,0)`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wave ripple lines
  for (let i = 0; i < 120; i++) {
    const y   = Math.random() * SIZE;
    const x   = Math.random() * SIZE;
    const len = 20 + Math.random() * 100;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + len*0.25, y - 4,
      x + len*0.75, y + 4,
      x + len, y
    );
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + Math.random()*0.10})`;
    ctx.lineWidth   = 0.6 + Math.random() * 1.4;
    ctx.stroke();
  }

  // Foam flecks
  for (let i = 0; i < 80; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE;
    const r  = 2 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random()*0.07})`;
    ctx.fill();
  }

  tex.update();
  tex.uScale = 8;
  tex.vScale = 8;

  const mat = new StandardMaterial('oceanMat', scene);
  mat.diffuseTexture = tex;
  mat.specularColor  = new Color3(0.6, 0.75, 0.95);
  mat.specularPower  = 180;
  mat.alpha          = 0.92;
  ocean.material     = mat;

  // Gentle primary bob
  const anim = new Animation('wave', 'position.y', 30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE);
  anim.setKeys([
    { frame:  0, value: -2.2 },
    { frame: 18, value: -1.5 },
    { frame: 36, value: -2.4 },
    { frame: 54, value: -1.7 },
    { frame: 72, value: -2.2 },
  ]);
  ocean.animations = [anim];
  scene.beginAnimation(ocean, 0, 72, true);

  // ── Nearshore turquoise shallows ──────────────────────────────────────────
  const shallows = MeshBuilder.CreateGround('shallows', {
    width: 120000, height: 3500, subdivisions: 6
  }, scene);
  shallows.position.set(5000, -1.0, 0);

  const shTex = new DynamicTexture('shallowTex', 256, scene, false);
  const shCtx = shTex.getContext();
  const sg    = shCtx.createLinearGradient(0, 0, 256, 0);
  sg.addColorStop(0.0, '#0d7a6a');
  sg.addColorStop(0.3, '#12a08a');
  sg.addColorStop(0.7, '#18c4a8');
  sg.addColorStop(1.0, '#22d4b8');
  shCtx.fillStyle = sg;
  shCtx.fillRect(0, 0, 256, 256);
  // Ripple lines in shallows
  for (let i = 0; i < 40; i++) {
    const y   = Math.random() * 256;
    const x   = Math.random() * 256;
    const len = 15 + Math.random() * 60;
    shCtx.beginPath();
    shCtx.moveTo(x, y);
    shCtx.lineTo(x + len, y + (Math.random()-0.5)*4);
    shCtx.strokeStyle = `rgba(255,255,255,${0.08 + Math.random()*0.12})`;
    shCtx.lineWidth   = 0.8 + Math.random() * 1.2;
    shCtx.stroke();
  }
  shTex.update();
  shTex.uScale = 12;
  shTex.vScale = 4;
  const shMat = new StandardMaterial('shallowMat', scene);
  shMat.diffuseTexture = shTex;
  shMat.specularColor  = new Color3(0.3, 0.6, 0.55);
  shMat.alpha          = 0.78;
  shallows.material    = shMat;

  // Shallows bob — slightly different phase
  const shAnim = new Animation('shWave', 'position.y', 30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE);
  shAnim.setKeys([
    { frame:  0, value: -1.0 },
    { frame: 22, value: -0.4 },
    { frame: 44, value: -1.2 },
    { frame: 66, value: -0.6 },
    { frame: 88, value: -1.0 },
  ]);
  shallows.animations = [shAnim];
  scene.beginAnimation(shallows, 0, 88, true);

  // ── Shore foam strip ──────────────────────────────────────────────────────
  const foam = MeshBuilder.CreateGround('foam', {
    width: 120000, height: 400, subdivisions: 4
  }, scene);
  foam.position.set(7500, -0.5, 0);
  const fMat = new StandardMaterial('foamMat', scene);
  fMat.diffuseColor  = new Color3(0.92, 0.96, 0.98);
  fMat.specularColor = new Color3(0.1, 0.1, 0.1);
  fMat.alpha         = 0.55;
  foam.material      = fMat;

  const fAnim = new Animation('foamBob', 'position.y', 30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE);
  fAnim.setKeys([
    { frame:  0, value: -0.5 },
    { frame: 15, value:  0.2 },
    { frame: 30, value: -0.5 },
  ]);
  foam.animations = [fAnim];
  scene.beginAnimation(foam, 0, 30, true);

  // ── Boats ─────────────────────────────────────────────────────────────────
  _spawnBoats(scene);

  return ocean;
}

function _spawnBoats(scene) {
  const fleet = [
    { x: -5500,  z: -9200,  rot: 0.3,  type: 'fishing' },
    { x: -4200,  z: -6800,  rot: 1.1,  type: 'sail'    },
    { x: -6800,  z: -11500, rot: 2.4,  type: 'fishing' },
    { x: -3800,  z: -4200,  rot: 0.8,  type: 'sail'    },
    { x: -7200,  z: -7500,  rot: 3.2,  type: 'cargo'   },
    { x: -5000,  z: -13000, rot: 1.8,  type: 'fishing' },
  ];

  fleet.forEach((b, i) => {
    const isSail  = b.type === 'sail';
    const isCargo = b.type === 'cargo';

    // Hull
    const hull = MeshBuilder.CreateBox('hull'+i, {
      width:  isCargo ? 500 : 160,
      height: isCargo ? 80  : 55,
      depth:  isCargo ? 900 : 520,
    }, scene);
    hull.position.set(b.x, -1.0, b.z);
    hull.rotation.y = b.rot;
    const hMat = new StandardMaterial('hullMat'+i, scene);
    hMat.diffuseColor = isCargo
      ? new Color3(0.55, 0.50, 0.45)
      : i % 2 === 0
        ? new Color3(0.90, 0.88, 0.82)
        : new Color3(0.72, 0.20, 0.12);
    hull.material = hMat;

    // Cabin
    const cabin = MeshBuilder.CreateBox('cabin'+i, {
      width:  isCargo ? 300 : 110,
      height: isCargo ? 120 : 75,
      depth:  isCargo ? 250 : 160,
    }, scene);
    cabin.position.set(0, isCargo ? 100 : 65, isCargo ? -100 : -70);
    cabin.parent = hull;
    const cMat = new StandardMaterial('cabinMat'+i, scene);
    cMat.diffuseColor = new Color3(0.82, 0.82, 0.78);
    cabin.material = cMat;

    // Mast
    const mast = MeshBuilder.CreateCylinder('mast'+i, {
      height: isSail ? 550 : 320,
      diameter: isCargo ? 28 : 16,
      tessellation: 8,
    }, scene);
    mast.position.set(0, isSail ? 340 : 220, 40);
    mast.parent = hull;
    const mMat = new StandardMaterial('mastMat'+i, scene);
    mMat.diffuseColor = new Color3(0.68, 0.52, 0.28);
    mast.material = mMat;

    // Sail on sailboats
    if (isSail) {
      const sail = MeshBuilder.CreatePlane('sail'+i, {
        width: 260, height: 380, sideOrientation: 2,
      }, scene);
      sail.position.set(60, 80, 40);
      sail.rotation.y = Math.PI / 6;
      sail.parent = mast;
      const sMat = new StandardMaterial('sailMat'+i, scene);
      sMat.diffuseColor  = new Color3(0.95, 0.93, 0.88);
      sMat.backFaceCulling = false;
      sail.material = sMat;
    }

    // Cargo containers on cargo ship
    if (isCargo) {
      const colors = [
        new Color3(0.8, 0.2, 0.1),
        new Color3(0.1, 0.4, 0.7),
        new Color3(0.2, 0.6, 0.2),
        new Color3(0.8, 0.6, 0.1),
      ];
      for (let c = 0; c < 4; c++) {
        const box = MeshBuilder.CreateBox('cargo'+i+'_'+c, {
          width: 160, height: 100, depth: 200
        }, scene);
        box.position.set(-160 + c*100, 120, 100);
        box.parent = hull;
        const bMat = new StandardMaterial('cargoMat'+i+'_'+c, scene);
        bMat.diffuseColor = colors[c % colors.length];
        box.material = bMat;
      }
    }

    // Individual bob per boat — different phase per boat
    const offset = i * 11;
    const ba = new Animation('boatBob'+i, 'position.y', 30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);
    ba.setKeys([
      { frame: offset,      value: -1.0  },
      { frame: offset + 20, value:  0.4  },
      { frame: offset + 40, value: -1.4  },
      { frame: offset + 60, value:  0.1  },
      { frame: offset + 80, value: -1.0  },
    ]);
    hull.animations = [ba];
    scene.beginAnimation(hull, 0, 80, true);

    // Gentle yaw rock
    const ra = new Animation('boatRock'+i, 'rotation.z', 30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);
    ra.setKeys([
      { frame:  0, value:  0.02 },
      { frame: 30, value: -0.03 },
      { frame: 60, value:  0.02 },
    ]);
    hull.animations.push(ra);
    scene.beginAnimation(hull, 0, 60, true);
  });
}