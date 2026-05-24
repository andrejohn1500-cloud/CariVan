import { MeshBuilder, StandardMaterial, Color3, Vector3 } from '@babylonjs/core';

export class VanController {
  constructor(scene, terrain, startPos) {
    this.scene = scene;
    this.terrain = terrain;
    this.speed = 0;
    this.maxSpeed = 280;
    this.acceleration = 60;
    this.braking = 120;
    this.steerAngle = 0;
    this.maxSteer = 0.045;
    this.friction = 0.92;
    this.input = { forward: 0, backward: 0, left: 0, right: 0, honk: false };
    this.mesh = this._buildVanMesh(startPos || new Vector3(0, 5, 0));
    this._setupKeyboard();
    this._setupHorn();
  }

  _mat(name, r, g, b, sr, sg, sb, alpha) {
    const m = new StandardMaterial(name, this.scene);
    m.diffuseColor = new Color3(r, g, b);
    m.specularColor = new Color3(sr ?? 0.2, sg ?? 0.2, sb ?? 0.2);
    if (alpha !== undefined) m.alpha = alpha;
    return m;
  }

  _buildVanMesh(position) {
    const MINT   = [0.69, 0.95, 0.73];
    const MINT_D = [0.60, 0.88, 0.65];
    const DARK   = [0.04, 0.04, 0.06];
    const BLACK  = [0.08, 0.08, 0.08];
    const GOLD   = [0.72, 0.55, 0.18];
    const CHROME = [0.75, 0.75, 0.75];

    // ── BODY ──────────────────────────────────────────
    const body = MeshBuilder.CreateBox('van_body', {
      width: 2.1, height: 2.3, depth: 5.2
    }, this.scene);
    body.position = position.clone();
    body.position.y += 1.4;
    body.material = this._mat('bMat', ...MINT, 0.4, 0.5, 0.4);

    // ── HIGH ROOF ──────────────────────────────────────
    const roof = MeshBuilder.CreateBox('van_roof', {
      width: 2.0, height: 0.35, depth: 4.6
    }, this.scene);
    roof.parent = body;
    roof.position.y = 1.32;
    roof.material = this._mat('rMat', ...MINT_D, 0.3, 0.4, 0.3);

    // ── WINDSHIELD ─────────────────────────────────────
    const wshield = MeshBuilder.CreateBox('windshield', {
      width: 1.85, height: 0.85, depth: 0.08
    }, this.scene);
    wshield.parent = body;
    wshield.position.set(0, 0.55, 2.62);
    wshield.rotation.x = -0.12;
    const glassMat = this._mat('gMat', ...DARK, 0.6, 0.7, 0.8, 0.85);
    wshield.material = glassMat;

    // ── FRONT GRILLE (chrome slats) ────────────────────
    const grille = MeshBuilder.CreateBox('grille', {
      width: 1.7, height: 0.28, depth: 0.1
    }, this.scene);
    grille.parent = body;
    grille.position.set(0, -0.55, 2.62);
    grille.material = this._mat('grMat', 0.18, 0.18, 0.18, 0.5, 0.5, 0.5);

    // chrome slat lines
    for (let i = 0; i < 4; i++) {
      const slat = MeshBuilder.CreateBox('slat_' + i, {
        width: 1.65, height: 0.03, depth: 0.12
      }, this.scene);
      slat.parent = body;
      slat.position.set(0, -0.43 - i * 0.06, 2.63);
      slat.material = this._mat('slatM_' + i, ...CHROME, 0.8, 0.8, 0.8);
    }

    // ── FRONT BUMPER ───────────────────────────────────
    const bumper = MeshBuilder.CreateBox('bumper_f', {
      width: 2.1, height: 0.22, depth: 0.25
    }, this.scene);
    bumper.parent = body;
    bumper.position.set(0, -1.0, 2.55);
    bumper.material = this._mat('bmpMat', ...BLACK, 0.1, 0.1, 0.1);

    // ── HEADLIGHTS ─────────────────────────────────────
    [-0.72, 0.72].forEach((x, i) => {
      const hl = MeshBuilder.CreateBox('hl_' + i, {
        width: 0.45, height: 0.28, depth: 0.08
      }, this.scene);
      hl.parent = body;
      hl.position.set(x, -0.22, 2.64);
      hl.material = this._mat('hlM_' + i, 0.95, 0.92, 0.7, 0.4, 0.4, 0.3);
      hl.material.emissiveColor = new Color3(0.25, 0.22, 0.08);

      // DRL strip above headlight
      const drl = MeshBuilder.CreateBox('drl_' + i, {
        width: 0.45, height: 0.05, depth: 0.07
      }, this.scene);
      drl.parent = body;
      drl.position.set(x, -0.06, 2.64);
      drl.material = this._mat('drlM_' + i, 0.98, 0.98, 0.9, 0.6, 0.6, 0.5);
      drl.material.emissiveColor = new Color3(0.4, 0.4, 0.3);
    });

    // ── FRONT PLATE ────────────────────────────────────
    const plate = MeshBuilder.CreateBox('plate_f', {
      width: 0.75, height: 0.20, depth: 0.05
    }, this.scene);
    plate.parent = body;
    plate.position.set(0, -0.90, 2.66);
    plate.material = this._mat('platM', 0.92, 0.92, 0.92, 0.3, 0.3, 0.3);

    // ── SIDE WINDOWS ───────────────────────────────────
    const winZL = [0.9, 0.05];           // left side (2 windows — door side open)
    const winZR = [0.9, 0.05, -0.85];   // right side (3 windows)
    const winMat = this._mat('winMat', ...DARK, 0.5, 0.6, 0.7, 0.88);

    winZL.forEach((z, wi) => {
      const w = MeshBuilder.CreateBox('winL_' + wi, {
        width: 0.07, height: 0.52, depth: 0.75
      }, this.scene);
      w.parent = body;
      w.position.set(-1.06, 0.5, z);
      w.material = winMat;
    });
    winZR.forEach((z, wi) => {
      const w = MeshBuilder.CreateBox('winR_' + wi, {
        width: 0.07, height: 0.52, depth: 0.75
      }, this.scene);
      w.parent = body;
      w.position.set(1.06, 0.5, z);
      w.material = winMat;
    });

    // ── SIDE BODY TRIM STRIP ───────────────────────────
    [-1.07, 1.07].forEach((x, i) => {
      const trim = MeshBuilder.CreateBox('trim_' + i, {
        width: 0.07, height: 0.12, depth: 5.1
      }, this.scene);
      trim.parent = body;
      trim.position.set(x, -0.65, 0);
      trim.material = this._mat('trimM_' + i, ...BLACK, 0.1, 0.1, 0.1);
    });

    // ── SIDE MIRRORS ───────────────────────────────────
    [-1.15, 1.15].forEach((x, i) => {
      const mir = MeshBuilder.CreateBox('mir_' + i, {
        width: 0.12, height: 0.18, depth: 0.32
      }, this.scene);
      mir.parent = body;
      mir.position.set(x, 0.62, 1.9);
      mir.material = this._mat('mirM_' + i, ...MINT_D, 0.3, 0.4, 0.3);
    });

    // ── OPEN SLIDING DOOR (right side) ─────────────────
    // Gap/opening where door was (dark interior visible)
    const doorGap = MeshBuilder.CreateBox('door_gap', {
      width: 0.10, height: 1.80, depth: 1.05
    }, this.scene);
    doorGap.parent = body;
    doorGap.position.set(1.07, 0.08, 0.22);
    doorGap.material = this._mat('gapMat', ...DARK, 0.1, 0.1, 0.1, 0.97);

    // Interior floor visible through gap
    const intFloor = MeshBuilder.CreateBox('int_floor', {
      width: 0.5, height: 0.06, depth: 1.0
    }, this.scene);
    intFloor.parent = body;
    intFloor.position.set(0.85, -0.82, 0.22);
    intFloor.material = this._mat('floorMat', 0.12, 0.10, 0.10, 0.1, 0.1, 0.1);

    // Step board below door opening
    const step = MeshBuilder.CreateBox('step', {
      width: 0.35, height: 0.08, depth: 0.95
    }, this.scene);
    step.parent = body;
    step.position.set(1.2, -0.98, 0.22);
    step.material = this._mat('stepMat', ...BLACK, 0.2, 0.2, 0.2);

    // Door panel slid back
    const slideDoor = MeshBuilder.CreateBox('slide_door', {
      width: 0.09, height: 1.82, depth: 1.40
    }, this.scene);
    slideDoor.parent = body;
    slideDoor.position.set(1.07, 0.08, -1.52);
    slideDoor.material = this._mat('sdMat', ...MINT, 0.4, 0.5, 0.4);

    // Door handle on slid panel
    const handle = MeshBuilder.CreateBox('d_handle', {
      width: 0.13, height: 0.08, depth: 0.25
    }, this.scene);
    handle.parent = body;
    handle.position.set(1.14, 0.08, -0.85);
    handle.material = this._mat('hndMat', 0.3, 0.3, 0.3, 0.7, 0.7, 0.7);

    // ── REAR WINDOW ────────────────────────────────────
    const rearWin = MeshBuilder.CreateBox('rear_win', {
      width: 1.5, height: 0.6, depth: 0.07
    }, this.scene);
    rearWin.parent = body;
    rearWin.position.set(0, 0.5, -2.62);
    rearWin.material = glassMat;

    // ── TAIL LIGHTS ────────────────────────────────────
    [-0.65, 0.65].forEach((x, i) => {
      const tl = MeshBuilder.CreateBox('tail_' + i, {
        width: 0.35, height: 0.22, depth: 0.07
      }, this.scene);
      tl.parent = body;
      tl.position.set(x, -0.35, -2.63);
      const tlm = this._mat('tlM_' + i, 0.85, 0.1, 0.1, 0.3, 0.05, 0.05);
      tlm.emissiveColor = new Color3(0.18, 0.0, 0.0);
      tl.material = tlm;
    });

    // Rear bumper
    const rbumper = MeshBuilder.CreateBox('bumper_r', {
      width: 2.1, height: 0.20, depth: 0.22
    }, this.scene);
    rbumper.parent = body;
    rbumper.position.set(0, -1.0, -2.54);
    rbumper.material = this._mat('rbMat', ...BLACK, 0.1, 0.1, 0.1);

    // ── WHEELS — 4 lowered black tyres + gold rims ─────
    const wheelPos = [
      new Vector3(-1.15, -0.88, 1.55),
      new Vector3( 1.15, -0.88, 1.55),
      new Vector3(-1.15, -0.88, -1.55),
      new Vector3( 1.15, -0.88, -1.55)
    ];
    this.wheels = wheelPos.map((pos, i) => {
      // Tyre
      const w = MeshBuilder.CreateCylinder('wheel_' + i, {
        diameter: 0.95, height: 0.42, tessellation: 20
      }, this.scene);
      w.rotation.z = Math.PI / 2;
      w.parent = body;
      w.position = pos;
      w.material = this._mat('wm_' + i, ...BLACK, 0.05, 0.05, 0.05);

      // Gold rim
      const hub = MeshBuilder.CreateCylinder('hub_' + i, {
        diameter: 0.55, height: 0.44, tessellation: 16
      }, this.scene);
      hub.rotation.z = Math.PI / 2;
      hub.parent = body;
      hub.position = pos;
      hub.material = this._mat('hm_' + i, ...GOLD, 0.7, 0.55, 0.2);

      // Centre cap
      const cap = MeshBuilder.CreateCylinder('cap_' + i, {
        diameter: 0.18, height: 0.45, tessellation: 10
      }, this.scene);
      cap.rotation.z = Math.PI / 2;
      cap.parent = body;
      cap.position = pos;
      cap.material = this._mat('capM_' + i, ...CHROME, 0.9, 0.9, 0.9);

      return w;
    });

    return body;
  }

  _setupKeyboard() {
    const keys = {};
    window.addEventListener('keydown', e => { keys[e.key] = true; });
    window.addEventListener('keyup',   e => { keys[e.key] = false; });
    const self = this;
    this.scene.onBeforeRenderObservable.add(() => {
      self.input.forward  = (keys['ArrowUp']    || keys['w'] || keys['W']) ? 1 : 0;
      self.input.backward = (keys['ArrowDown']  || keys['s'] || keys['S']) ? 1 : 0;
      self.input.left     = (keys['ArrowLeft']  || keys['a'] || keys['A']) ? 1 : 0;
      self.input.right    = (keys['ArrowRight'] || keys['d'] || keys['D']) ? 1 : 0;
      self.input.honk     = keys['h'] || keys['H'];
    });
  }

  _setupHorn() {
    this._hornPlaying = false;
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { this._audioCtx = null; }
  }

  _honk() {
    if (!this._audioCtx || this._hornPlaying) return;
    this._hornPlaying = true;
    const osc  = this._audioCtx.createOscillator();
    const gain = this._audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this._audioCtx.destination);
    osc.frequency.setValueAtTime(320, this._audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, this._audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(this._audioCtx.currentTime + 0.5);
    setTimeout(() => { this._hornPlaying = false; }, 600);
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    const ti = window.touchInput || { x: 0, y: 0, honk: false };
    const fwd = this.input.forward  || (ti.y < -0.2 ? -ti.y : 0);
    const bwd = this.input.backward || (ti.y >  0.2 ?  ti.y : 0);
    const lft = this.input.left     || (ti.x < -0.2 ? -ti.x : 0);
    const rgt = this.input.right    || (ti.x >  0.2 ?  ti.x : 0);

    if (fwd) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);
    } else if (bwd) {
      this.speed = Math.max(-this.maxSpeed * 0.4, this.speed - this.braking * dt);
    } else {
      this.speed *= this.friction;
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    const sf = Math.min(1, Math.abs(this.speed) / 30);
    if (lft) this.steerAngle -= this.maxSteer * sf;
    if (rgt) this.steerAngle += this.maxSteer * sf;
    this.steerAngle *= 0.88;

    const forward = new Vector3(
      Math.sin(this.mesh.rotation.y), 0,
      Math.cos(this.mesh.rotation.y)
    );
    this.mesh.rotation.y += this.steerAngle * Math.sign(this.speed);
    this.mesh.position.addInPlace(forward.scale(this.speed * dt));

    if (this.terrain) {
      const y = this.terrain.getHeightAtCoordinates(
        this.mesh.position.x, this.mesh.position.z) || 0;
      this.mesh.position.y = y + 1.4;
    }

    const wheelSpin = (this.speed / 20) * dt;
    if (this.wheels) {
      this.wheels.forEach(w => { w.rotation.x += wheelSpin; });
    }

    if (this.input.honk || ti.honk) this._honk();
  }

  getPosition() { return this.mesh.position.clone(); }

  setColor(r, g, b) {
    if (this.mesh && this.mesh.material) {
      this.mesh.material.diffuseColor = new Color3(r, g, b);
    }
  }
}