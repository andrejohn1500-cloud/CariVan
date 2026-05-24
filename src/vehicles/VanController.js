import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  Mesh, TransformNode
} from '@babylonjs/core';

export class VanController {
  constructor(scene, terrain, startPos) {
    this.scene    = scene;
    this.terrain  = terrain;
    this.speed    = 0;          // km/h
    this.maxSpeed = 80;         // realistic Vincy minibus top speed
    this.accel    = 12;         // km/h per second
    this.decel    = 20;         // braking
    this.friction = 0.88;       // engine-off coast-down
    this.steerAngle = 0;
    this.input = { fwd: 0, back: 0, left: 0, right: 0 };
    this._hornCtx = null;

    this.root = new TransformNode('vanRoot', scene);
    this.root.position = startPos || new Vector3(0, 3, 0);

    this._buildUrvan();
    this.mesh = this.root; // camera target

    this._setupKeyboard();
  }

  // ── Palette ──────────────────────────────────────────────────────────────
  _mat(name, hex, spec = 0.15) {
    const m = new StandardMaterial(name + '_mat', this.scene);
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    m.diffuseColor  = new Color3(r, g, b);
    m.specularColor = new Color3(spec, spec, spec);
    return m;
  }

  // ── Build a proper HiAce Urvan shape ─────────────────────────────────────
  _buildUrvan() {
    const sc = this.scene;
    const root = this.root;

    const bodyMat   = this._mat('body',   '#ECECE8', 0.25); // cream white
    const stripeMat = this._mat('stripe', '#4CAF72', 0.10); // Vincy green
    const glassMat  = this._mat('glass',  '#1A2B3C', 0.60);
    const tireMat   = this._mat('tire',   '#1A1A1A', 0.05);
    const rimMat    = this._mat('rim',    '#C9A84C', 0.80); // gold rims
    const lightMat  = this._mat('light',  '#FFFFCC', 0.90);
    const tailMat   = this._mat('tail',   '#CC2200', 0.50);
    const chromeMat = this._mat('chrome', '#C0C0C0', 0.90);
    const darkMat   = this._mat('dark',   '#2A2A2A', 0.05);

    // ── Main body (long passenger box) ──────────────────────────────────
    const body = MeshBuilder.CreateBox('body', {width:5.0, height:2.1, depth:2.1}, sc);
    body.material = bodyMat;
    body.position = new Vector3(0, 1.2, 0);
    body.parent = root;

    // ── Cab roof (slightly lower front section) ──────────────────────────
    const cabTop = MeshBuilder.CreateBox('cabTop', {width:1.6, height:0.25, depth:2.0}, sc);
    cabTop.material = bodyMat;
    cabTop.position = new Vector3(-1.72, 2.38, 0);
    cabTop.parent = root;

    // ── Green stripe along body sides ────────────────────────────────────
    const stripeR = MeshBuilder.CreateBox('stripeR', {width:5.02, height:0.45, depth:0.04}, sc);
    stripeR.material = stripeMat;
    stripeR.position = new Vector3(0, 1.05, 1.07);
    stripeR.parent = root;

    const stripeL = MeshBuilder.CreateBox('stripeL', {width:5.02, height:0.45, depth:0.04}, sc);
    stripeL.material = stripeMat;
    stripeL.position = new Vector3(0, 1.05, -1.07);
    stripeL.parent = root;

    // ── Front windscreen ──────────────────────────────────────────────────
    const windscreen = MeshBuilder.CreateBox('windscreen', {width:0.06, height:1.0, depth:1.75}, sc);
    windscreen.material = glassMat;
    windscreen.position = new Vector3(-2.53, 1.75, 0);
    windscreen.parent = root;

    // ── Front face (nose) ─────────────────────────────────────────────────
    const nose = MeshBuilder.CreateBox('nose', {width:0.25, height:0.7, depth:2.1}, sc);
    nose.material = bodyMat;
    nose.position = new Vector3(-2.62, 0.9, 0);
    nose.parent = root;

    // ── Headlights ────────────────────────────────────────────────────────
    const hlR = MeshBuilder.CreateBox('hlR', {width:0.08, height:0.28, depth:0.55}, sc);
    hlR.material = lightMat;
    hlR.position = new Vector3(-2.72, 1.0, 0.72);
    hlR.parent = root;

    const hlL = MeshBuilder.CreateBox('hlL', {width:0.08, height:0.28, depth:0.55}, sc);
    hlL.material = lightMat;
    hlL.position = new Vector3(-2.72, 1.0, -0.72);
    hlL.parent = root;

    // ── Grille ────────────────────────────────────────────────────────────
    const grille = MeshBuilder.CreateBox('grille', {width:0.08, height:0.22, depth:1.2}, sc);
    grille.material = chromeMat;
    grille.position = new Vector3(-2.72, 0.6, 0);
    grille.parent = root;

    // ── Side windows (right side — 3 passenger windows) ──────────────────
    for (let i = 0; i < 3; i++) {
      const wx = 0.8 + i * 1.15;
      const win = MeshBuilder.CreateBox('winR'+i, {width:0.9, height:0.55, depth:0.05}, sc);
      win.material = glassMat;
      win.position = new Vector3(wx, 1.75, 1.06);
      win.parent = root;
    }
    // Cab side window
    const cabWinR = MeshBuilder.CreateBox('cabWinR', {width:0.65, height:0.5, depth:0.05}, sc);
    cabWinR.material = glassMat;
    cabWinR.position = new Vector3(-1.75, 1.75, 1.06);
    cabWinR.parent = root;

    // ── Side windows (left side) ─────────────────────────────────────────
    for (let i = 0; i < 3; i++) {
      const wx = 0.8 + i * 1.15;
      const win = MeshBuilder.CreateBox('winL'+i, {width:0.9, height:0.55, depth:0.05}, sc);
      win.material = glassMat;
      win.position = new Vector3(wx, 1.75, -1.06);
      win.parent = root;
    }
    const cabWinL = MeshBuilder.CreateBox('cabWinL', {width:0.65, height:0.5, depth:0.05}, sc);
    cabWinL.material = glassMat;
    cabWinL.position = new Vector3(-1.75, 1.75, -1.06);
    cabWinL.parent = root;

    // ── Rear face ─────────────────────────────────────────────────────────
    const rear = MeshBuilder.CreateBox('rear', {width:0.08, height:2.1, depth:2.1}, sc);
    rear.material = bodyMat;
    rear.position = new Vector3(2.54, 1.2, 0);
    rear.parent = root;

    // ── Tail lights ───────────────────────────────────────────────────────
    const tlR = MeshBuilder.CreateBox('tlR', {width:0.08, height:0.22, depth:0.45}, sc);
    tlR.material = tailMat;
    tlR.position = new Vector3(2.56, 0.9, 0.72);
    tlR.parent = root;

    const tlL = MeshBuilder.CreateBox('tlL', {width:0.08, height:0.22, depth:0.45}, sc);
    tlL.material = tailMat;
    tlL.position = new Vector3(2.56, 0.9, -0.72);
    tlL.parent = root;

    // ── Sliding door outline (right side, passenger area) ─────────────────
    const door = MeshBuilder.CreateBox('slideDoor', {width:1.5, height:1.7, depth:0.04}, sc);
    door.material = this._mat('doorEdge', '#CCCCBB', 0.1);
    door.position = new Vector3(1.0, 1.2, 1.065);
    door.parent = root;

    // ── Black bottom sill (step board) ────────────────────────────────────
    const sill = MeshBuilder.CreateBox('sill', {width:5.0, height:0.12, depth:0.18}, sc);
    sill.material = darkMat;
    sill.position = new Vector3(0, 0.16, 1.14);
    sill.parent = root;

    const sillL = MeshBuilder.CreateBox('sillL', {width:5.0, height:0.12, depth:0.18}, sc);
    sillL.material = darkMat;
    sillL.position = new Vector3(0, 0.16, -1.14);
    sillL.parent = root;

    // ── Roof rack rails ──────────────────────────────────────────────────
    const roofR = MeshBuilder.CreateBox('roofR', {width:4.8, height:0.07, depth:0.07}, sc);
    roofR.material = chromeMat;
    roofR.position = new Vector3(0.1, 2.28, 0.85);
    roofR.parent = root;

    const roofL = MeshBuilder.CreateBox('roofL', {width:4.8, height:0.07, depth:0.07}, sc);
    roofL.material = chromeMat;
    roofL.position = new Vector3(0.1, 2.28, -0.85);
    roofL.parent = root;

    // ── Bumpers ──────────────────────────────────────────────────────────
    const frontBumper = MeshBuilder.CreateBox('fBumper', {width:0.2, height:0.22, depth:2.2}, sc);
    frontBumper.material = chromeMat;
    frontBumper.position = new Vector3(-2.72, 0.35, 0);
    frontBumper.parent = root;

    const rearBumper = MeshBuilder.CreateBox('rBumper', {width:0.2, height:0.22, depth:2.2}, sc);
    rearBumper.material = chromeMat;
    rearBumper.position = new Vector3(2.62, 0.35, 0);
    rearBumper.parent = root;

    // ── 4 Wheels ──────────────────────────────────────────────────────────
    const wheelPositions = [
      new Vector3(-1.6, 0.42, 1.12),   // front right
      new Vector3(-1.6, 0.42, -1.12),  // front left
      new Vector3( 1.5, 0.42, 1.12),   // rear right
      new Vector3( 1.5, 0.42, -1.12),  // rear left
    ];

    wheelPositions.forEach((pos, i) => {
      const tire = MeshBuilder.CreateCylinder('tire'+i, {
        diameter: 0.84, height: 0.38, tessellation: 20
      }, sc);
      tire.material = tireMat;
      tire.rotation.z = Math.PI / 2;
      tire.position = pos.clone();
      tire.parent = root;

      const rim = MeshBuilder.CreateCylinder('rim'+i, {
        diameter: 0.52, height: 0.39, tessellation: 16
      }, sc);
      rim.material = rimMat;
      rim.rotation.z = Math.PI / 2;
      rim.position = pos.clone();
      rim.parent = root;

      // Hub cap
      const hub = MeshBuilder.CreateCylinder('hub'+i, {
        diameter: 0.18, height: 0.40, tessellation: 8
      }, sc);
      hub.material = chromeMat;
      hub.rotation.z = Math.PI / 2;
      hub.position = pos.clone();
      hub.parent = root;
    });
  }

  // ── Keyboard controls ─────────────────────────────────────────────────
  _setupKeyboard() {
    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp'   || e.key === 'w') this.input.fwd   = 1;
      if (e.key === 'ArrowDown' || e.key === 's') this.input.back  = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left  = 1;
      if (e.key === 'ArrowRight'|| e.key === 'd') this.input.right = 1;
      if (e.key === ' ') this.honk();
    });
    window.addEventListener('keyup', e => {
      if (e.key === 'ArrowUp'   || e.key === 'w') this.input.fwd   = 0;
      if (e.key === 'ArrowDown' || e.key === 's') this.input.back  = 0;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.input.left  = 0;
      if (e.key === 'ArrowRight'|| e.key === 'd') this.input.right = 0;
    });
  }

  // ── Joystick input (called from UI) ──────────────────────────────────
  setJoystick(nx, ny) {
    // ny: -1 = full forward, +1 = full reverse
    // nx: -1 = hard left, +1 = hard right
    this.input.fwd   = Math.max(0, -ny);
    this.input.back  = Math.max(0,  ny);
    this.input.left  = Math.max(0, -nx);
    this.input.right = Math.max(0,  nx);
  }

  // ── Horn — real audio beep ────────────────────────────────────────────
  honk() {
    try {
      if (!this._hornCtx) {
        this._hornCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this._hornCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // Vincy bus horn — two-tone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.setValueAtTime(320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.55, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } catch(e) {
      console.warn('Horn audio failed:', e);
    }
  }

  // ── Physics update (call every frame) ────────────────────────────────
  update(deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05); // seconds, capped at 50ms
    const speedMs = this.speed / 3.6; // convert km/h → m/s for world units

    // Throttle / brake
    if (this.input.fwd > 0) {
      this.speed = Math.min(this.speed + this.accel * dt * this.input.fwd, this.maxSpeed);
    } else if (this.input.back > 0) {
      this.speed = Math.max(this.speed - this.decel * dt * this.input.back, -this.maxSpeed * 0.4);
    } else {
      // Coast — apply friction
      this.speed *= (1 - (1 - this.friction) * dt * 60);
      if (Math.abs(this.speed) < 0.5) this.speed = 0;
    }

    // Steering — ONLY turns when actually moving (no spinning in place)
    const speedFactor = Math.min(Math.abs(this.speed) / 15, 1); // 0 at 0 km/h, 1 at 15+ km/h
    const steerDir = (this.input.right - this.input.left);
    const maxRotPerSec = 1.2; // radians/sec at full speed
    const steerAmount = steerDir * maxRotPerSec * speedFactor * dt;
    this.root.rotation.y += steerAmount * Math.sign(this.speed);

    // Move forward along facing direction
    const fwd = new Vector3(
      -Math.sin(this.root.rotation.y),
      0,
      -Math.cos(this.root.rotation.y)
    );
    const worldSpeedPerSec = this.speed / 3.6 * 10; // scaled for world units
    this.root.position.addInPlace(fwd.scale(worldSpeedPerSec * dt));

    // Terrain follow — keep van on ground
    if (this.terrain) {
      const groundY = this._getGroundHeight(this.root.position.x, this.root.position.z);
      this.root.position.y = groundY + 0.42; // wheel radius offset
    }
  }

  _getGroundHeight(x, z) {
    try {
      if (this.terrain.getHeightAtCoordinates) {
        return this.terrain.getHeightAtCoordinates(x, z) || 0;
      }
    } catch(e) {}
    return 0;
  }

  // Speed in km/h for HUD display
  getSpeed() {
    return Math.round(Math.abs(this.speed));
  }
}