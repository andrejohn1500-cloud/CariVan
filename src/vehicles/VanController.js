import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, SceneLoader, Tools
} from '@babylonjs/core';

// ─────────────────────────────────────────────────────────────────────────────
//  CariVan — Advanced GTA-Style Van Controller
//  Nissan Caravan E25 · St. Vincent & the Grenadines 🇻🇨
// ─────────────────────────────────────────────────────────────────────────────

const CFG = {
  // ── Engine ──────────────────────────────────────────────────────────────
  topSpeedKph:        95,        // Vincy minibus realistic top
  reverseSpeedKph:    25,
  engineTorque:       18,        // acceleration force
  engineBrake:        6,         // lift-off decel
  footBrake:          38,        // brake pedal decel
  handbrakeForce:     55,        // e-brake decel

  // ── Traction / drift ────────────────────────────────────────────────────
  tractionFull:       1.0,       // grip on normal road
  tractionHandbrake:  0.18,      // rear slip on e-brake
  tractionLow:        0.55,      // wet / dirt surface feel
  lateralFriction:    0.82,      // sideways grip (higher = less drift)
  driftThreshold:     62,        // kph before oversteer kicks in

  // ── Steering ────────────────────────────────────────────────────────────
  steerMaxRad:        0.58,      // max wheel turn angle
  steerSpeedLow:      2.8,       // turn rate at low speed
  steerSpeedHigh:     1.1,       // turn rate at high speed
  steerReturnRate:    5.5,       // auto-centre rate
  steerSpeedBlend:    80,        // kph where low→high blends

  // ── Suspension ──────────────────────────────────────────────────────────
  suspensionHeight:   0.52,      // ride height above ground
  suspensionStiff:    12,        // body bounce stiffness
  suspensionDamp:     0.72,      // bounce damping
  rollFactor:         0.04,      // body roll in corners
  pitchFactor:        0.025,     // nose-dip under braking

  // ── Weight ──────────────────────────────────────────────────────────────
  mass:               2100,      // kg — E25 Caravan loaded
  cgHeight:           1.1,       // centre of gravity height

  // ── World scale ─────────────────────────────────────────────────────────
  worldScale:         10,        // game units per real metre
};

export class VanController {
  constructor(scene, terrain, startPos) {
    this.scene   = scene;
    this.terrain = terrain;

    // ── State vectors ──────────────────────────────────────────────────
    this.velocity        = Vector3.Zero();   // world-space m/s
    this.speed           = 0;                // signed kph
    this.steerAngle      = 0;               // current steer rad
    this.heading         = 0;               // yaw rad
    this.bodyRoll        = 0;
    this.bodyPitch       = 0;
    this.suspOffset      = 0;
    this.suspVelocity    = 0;
    this.engineRpm       = 800;
    this.gear            = 1;
    this.handbrakeActive = false;
    this.onGround        = true;
    this.airTime         = 0;
    this.skidding        = false;
    this.skidIntensity   = 0;

    // ── Wheel state ────────────────────────────────────────────────────
    this.wheelSpin   = [0, 0, 0, 0];  // visual spin angle per wheel
    this.wheelSteer  = [0, 0, 0, 0];  // visual steer per wheel

    // ── Input (raw 0–1 axes) ───────────────────────────────────────────
    this.input = {
      throttle: 0, brake: 0,
      steerL: 0, steerR: 0,
      handbrake: 0, horn: false,
      nitro: 0,
    };

    // ── Audio context ──────────────────────────────────────────────────
    this._audioCtx  = null;
    this._engineOsc = null;
    this._engineGain = null;
    this._skidNode  = null;

    // ── Scene nodes ────────────────────────────────────────────────────
    this.root = new TransformNode('vanRoot', scene);
    this.root.position = startPos
      ? startPos.clone()
      : new Vector3(0, 4, 0);
    this.heading = 0;

    this._bodyNode   = new TransformNode('vanBody', scene);
    this._bodyNode.parent = this.root;

    this._wheelNodes = [];   // TransformNode per wheel (4)
    this._wheelMeshes = [];  // visual mesh per wheel

    // ── Build ──────────────────────────────────────────────────────────
    this._tryLoadGLB();
    this._buildWheels();
    this._setupInput();
    this._initAudio();

    this.mesh = this.root;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GLB LOADER — tries real model, falls back to box van
  // ═══════════════════════════════════════════════════════════════════════
  _tryLoadGLB() {
    SceneLoader.ImportMeshAsync('', '/assets/', 'van_caravan.glb', this.scene)
      .then(result => {
        result.meshes.forEach(m => {
          m.parent = this._bodyNode;
          m.receiveShadows = true;
        });
        // Orient GLB — most Sketchfab models face +Z, game faces -Z
        this._bodyNode.rotation.y = Math.PI;
        // Scale to match world units (E25 is ~4.7m long)
        const scale = (4.7 * CFG.worldScale) / 47;
        this._bodyNode.scaling = new Vector3(scale, scale, scale);
        this._bodyNode.position.y = CFG.suspensionHeight;
        console.log('✅ van_caravan.glb loaded');
      })
      .catch(() => {
        console.warn('GLB not found — using procedural van mesh');
        this._buildProceduralVan();
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PROCEDURAL VAN (fallback) — keeps game running without GLB
  // ═══════════════════════════════════════════════════════════════════════
  _mat(n, hex, spec = 0.15) {
    const m = new StandardMaterial(n + '_mat', this.scene);
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    m.diffuseColor  = new Color3(r, g, b);
    m.specularColor = new Color3(spec, spec, spec);
    return m;
  }

  _buildProceduralVan() {
    const sc   = this.scene;
    const root = this._bodyNode;
    const bodyMat   = this._mat('body',   '#ECECE8', 0.25);
    const stripeMat = this._mat('stripe', '#4CAF72', 0.10);
    const glassMat  = this._mat('glass',  '#1A2B3C', 0.60);
    const chromeMat = this._mat('chrome', '#C0C0C0', 0.90);
    const tailMat   = this._mat('tail',   '#CC2200', 0.50);
    const lightMat  = this._mat('light',  '#FFFFCC', 0.90);
    const darkMat   = this._mat('dark',   '#2A2A2A', 0.05);

    const mk = (n, w, h, d, x, y, z, mat) => {
      const b = MeshBuilder.CreateBox(n, {width:w, height:h, depth:d}, sc);
      b.material = mat; b.position.set(x, y, z);
      b.parent = root; return b;
    };

    mk('body',    5.0, 2.1, 2.1,  0,    1.2,  0,    bodyMat);
    mk('cabTop',  1.6, 0.25,2.0, -1.72, 2.38, 0,    bodyMat);
    mk('stripeR', 5.02,0.45,0.04, 0,    1.05, 1.07, stripeMat);
    mk('stripeL', 5.02,0.45,0.04, 0,    1.05,-1.07, stripeMat);
    mk('screen',  0.06,1.0, 1.75,-2.53, 1.75, 0,    glassMat);
    mk('nose',    0.25,0.7, 2.1, -2.62, 0.9,  0,    bodyMat);
    mk('hlR',     0.08,0.28,0.55,-2.72, 1.0,  0.72, lightMat);
    mk('hlL',     0.08,0.28,0.55,-2.72, 1.0, -0.72, lightMat);
    mk('grille',  0.08,0.22,1.2, -2.72, 0.6,  0,    chromeMat);
    mk('rear',    0.08,2.1, 2.1,  2.54, 1.2,  0,    bodyMat);
    mk('tlR',     0.08,0.22,0.45, 2.56, 0.9,  0.72, tailMat);
    mk('tlL',     0.08,0.22,0.45, 2.56, 0.9, -0.72, tailMat);
    mk('fBumper', 0.2, 0.22,2.2, -2.72, 0.35, 0,    chromeMat);
    mk('rBumper', 0.2, 0.22,2.2,  2.62, 0.35, 0,    chromeMat);
    mk('sillR',   5.0, 0.12,0.18, 0,    0.16, 1.14, darkMat);
    mk('sillL',   5.0, 0.12,0.18, 0,    0.16,-1.14, darkMat);
    for (let i = 0; i < 3; i++) {
      const wx = 0.8 + i * 1.15;
      mk('wR'+i, 0.9, 0.55,0.05, wx, 1.75, 1.06, glassMat);
      mk('wL'+i, 0.9, 0.55,0.05, wx, 1.75,-1.06, glassMat);
    }
    mk('cabWR', 0.65,0.5, 0.05,-1.75,1.75, 1.06, glassMat);
    mk('cabWL', 0.65,0.5, 0.05,-1.75,1.75,-1.06, glassMat);

    root.position.y = CFG.suspensionHeight;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  WHEELS — 4 visual nodes with spin + steer
  // ═══════════════════════════════════════════════════════════════════════
  _buildWheels() {
    const sc = this.scene;
    const tireMat = this._mat('tire', '#1A1A1A', 0.05);
    const rimMat  = this._mat('rim',  '#C9A84C', 0.80);
    const hubMat  = this._mat('hub',  '#C0C0C0', 0.90);

    const positions = [
      { x: -1.6,  z:  1.12, front: true  },   // FR
      { x: -1.6,  z: -1.12, front: true  },   // FL
      { x:  1.5,  z:  1.12, front: false },   // RR
      { x:  1.5,  z: -1.12, front: false },   // RL
    ];

    positions.forEach((pos, i) => {
      const node = new TransformNode('wheelNode'+i, sc);
      node.parent   = this.root;
      node.position = new Vector3(pos.x, CFG.suspensionHeight, pos.z);
      node.isFront  = pos.front;

      const tire = MeshBuilder.CreateCylinder('tire'+i, {
        diameter: 0.84, height: 0.38, tessellation: 24
      }, sc);
      tire.material  = tireMat;
      tire.rotation.z = Math.PI / 2;
      tire.parent    = node;

      const rim = MeshBuilder.CreateCylinder('rim'+i, {
        diameter: 0.52, height: 0.39, tessellation: 18
      }, sc);
      rim.material  = rimMat;
      rim.rotation.z = Math.PI / 2;
      rim.parent    = node;

      const hub = MeshBuilder.CreateCylinder('hub'+i, {
        diameter: 0.16, height: 0.40, tessellation: 8
      }, sc);
      hub.material  = hubMat;
      hub.rotation.z = Math.PI / 2;
      hub.parent    = node;

      this._wheelNodes.push(node);
      this._wheelMeshes.push(tire);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  INPUT SETUP — keyboard + touch joystick
  // ═══════════════════════════════════════════════════════════════════════
  _setupInput() {
    const keys = {};
    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.key === ' ') { e.preventDefault(); this.honk(); }
      if (e.key === 'h' || e.key === 'H') this.honk();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    // Poll keys each frame rather than set once — smoother
    this._pollKeys = () => {
      this.input.throttle  = (keys['ArrowUp']    || keys['w'] || keys['W']) ? 1 : 0;
      this.input.brake     = (keys['ArrowDown']  || keys['s'] || keys['S']) ? 1 : 0;
      this.input.steerL    = (keys['ArrowLeft']  || keys['a'] || keys['A']) ? 1 : 0;
      this.input.steerR    = (keys['ArrowRight'] || keys['d'] || keys['D']) ? 1 : 0;
      this.input.handbrake = (keys['Shift'] || keys['e'] || keys['E'])      ? 1 : 0;
    };
  }

  // ── Joystick from UI ──────────────────────────────────────────────────
  setJoystick(nx, ny) {
    this.input.throttle  = Math.max(0, -ny);
    this.input.brake     = Math.max(0,  ny);
    this.input.steerL    = Math.max(0, -nx);
    this.input.steerR    = Math.max(0,  nx);
  }

  setHandbrake(v) { this.input.handbrake = v ? 1 : 0; }

  // ═══════════════════════════════════════════════════════════════════════
  //  AUDIO ENGINE — procedural engine + skid sounds
  // ═══════════════════════════════════════════════════════════════════════
  _initAudio() {
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;

      // Engine oscillator
      this._engineOsc  = ctx.createOscillator();
      this._engineGain = ctx.createGain();
      const dist = ctx.createWaveShaper();
      dist.curve = this._makeDistCurve(80);
      this._engineOsc.type = 'sawtooth';
      this._engineOsc.frequency.value = 60;
      this._engineOsc.connect(dist);
      dist.connect(this._engineGain);
      this._engineGain.connect(ctx.destination);
      this._engineGain.gain.value = 0.04;
      this._engineOsc.start();

      // Skid noise
      const bufSize = ctx.sampleRate * 0.5;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      this._skidBuf  = noiseBuf;
      this._skidGain = ctx.createGain();
      this._skidGain.gain.value = 0;
      this._skidGain.connect(ctx.destination);

    } catch(e) { console.warn('Audio init failed:', e); }
  }

  _makeDistCurve(amount) {
    const n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  _updateAudio(dt) {
    if (!this._audioCtx || !this._engineOsc) return;
    const ctx = this._audioCtx;
    const spd = Math.abs(this.speed);

    // Engine pitch follows RPM
    const targetRpm = 800 + (this.engineRpm - 800);
    const baseFreq  = 45 + targetRpm * 0.055;
    this._engineOsc.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.08);
    this._engineGain.gain.setTargetAtTime(
      0.03 + this.input.throttle * 0.06, ctx.currentTime, 0.05
    );

    // Skid sound
    if (this._skidGain) {
      const skidVol = this.skidding ? Math.min(this.skidIntensity * 0.18, 0.22) : 0;
      this._skidGain.gain.setTargetAtTime(skidVol, ctx.currentTime, 0.04);
    }
  }

  // ── Horn ──────────────────────────────────────────────────────────────
  honk() {
    try {
      if (!this._audioCtx) return;
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(390, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.13);
      osc.frequency.setValueAtTime(390, ctx.currentTime + 0.26);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    } catch(e) {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GEAR BOX — automatic with engine RPM simulation
  // ═══════════════════════════════════════════════════════════════════════
  _updateGearbox(dt) {
    const spd = Math.abs(this.speed);
    const gearRanges = [0, 15, 30, 50, 72, 95];
    let targetGear = 1;
    for (let g = 1; g < gearRanges.length; g++) {
      if (spd > gearRanges[g - 1]) targetGear = g;
    }
    if (this.speed < 0) targetGear = 0; // reverse

    // Smooth gear change
    if (targetGear !== this.gear) {
      this.gear = targetGear;
    }

    // RPM model
    const gearRatio = [3.5, 3.0, 2.1, 1.4, 1.0, 0.75][this.gear] || 1.0;
    const targetRpm = 800 + (spd / CFG.topSpeedKph) * gearRatio * 5200;
    this.engineRpm += (targetRpm - this.engineRpm) * Math.min(dt * 4, 1);
    this.engineRpm = Math.max(750, Math.min(6800, this.engineRpm));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  MAIN PHYSICS UPDATE
  // ═══════════════════════════════════════════════════════════════════════
  update(deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);

    if (this._pollKeys) this._pollKeys();

    const {
      throttle, brake, steerL, steerR, handbrake
    } = this.input;

    const speedKph = this.speed;
    const speedAbs = Math.abs(speedKph);
    const speedMs  = speedKph / 3.6;
    const moving   = speedAbs > 0.5;
    const fwdSign  = speedKph >= 0 ? 1 : -1;

    // ── 1. STEERING ──────────────────────────────────────────────────────
    const steerInput = steerR - steerL;
    const steerBlend = Math.min(speedAbs / CFG.steerSpeedBlend, 1);
    const steerRate  = CFG.steerSpeedLow + (CFG.steerSpeedHigh - CFG.steerSpeedLow) * steerBlend;

    // High-speed steering is reduced (realistic)
    const steerMax   = CFG.steerMaxRad * (1 - steerBlend * 0.45);

    if (steerInput !== 0) {
      this.steerAngle += steerInput * steerRate * dt;
      this.steerAngle  = Math.max(-steerMax, Math.min(steerMax, this.steerAngle));
    } else {
      // Auto-centre
      const returnSpeed = CFG.steerReturnRate * dt;
      if (Math.abs(this.steerAngle) < returnSpeed) {
        this.steerAngle = 0;
      } else {
        this.steerAngle -= Math.sign(this.steerAngle) * returnSpeed;
      }
    }

    // ── 2. THROTTLE / BRAKING / HANDBRAKE ────────────────────────────────
    this.handbrakeActive = handbrake > 0;

    if (this.handbrakeActive) {
      // E-brake — rear lockup
      this.speed -= Math.sign(speedKph) * CFG.handbrakeForce * dt;
    } else if (brake > 0) {
      if (speedKph > 0.5) {
        this.speed -= CFG.footBrake * brake * dt;
      } else if (speedKph > -CFG.reverseSpeedKph) {
        // Reverse from standstill
        this.speed -= CFG.engineTorque * 0.6 * brake * dt;
      }
    } else if (throttle > 0) {
      if (speedKph < CFG.topSpeedKph) {
        // Torque curve — peaks mid-range, drops at top
        const rpmFactor = 1 - Math.pow((this.engineRpm - 3500) / 3500, 2) * 0.3;
        this.speed += CFG.engineTorque * throttle * Math.max(0.4, rpmFactor) * dt;
      }
    } else {
      // Engine braking / coast
      const engineBrake = CFG.engineBrake * dt;
      if (Math.abs(speedKph) < engineBrake) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(speedKph) * engineBrake;
      }
    }

    // Clamp speed
    this.speed = Math.max(-CFG.reverseSpeedKph, Math.min(CFG.topSpeedKph, this.speed));

    // ── 3. TRACTION & DRIFT ───────────────────────────────────────────────
    let traction = CFG.tractionFull;
    if (this.handbrakeActive && speedAbs > 10) {
      traction = CFG.tractionHandbrake;
    }

    // Oversteer at high speed in corners
    const lateralForce = Math.abs(this.steerAngle) * speedAbs;
    this.skidding = lateralForce > CFG.driftThreshold * 0.4 || this.handbrakeActive;
    this.skidIntensity = Math.max(0, lateralForce / CFG.driftThreshold - 0.3);

    // ── 4. YAW / HEADING ──────────────────────────────────────────────────
    if (moving) {
      // Ackermann-style turn radius
      const wheelBase  = 2.8 * CFG.worldScale;
      const turnRadius = wheelBase / Math.tan(Math.abs(this.steerAngle) + 0.0001);
      const angularVel = (speedMs * CFG.worldScale) / turnRadius;

      // Drift modifies yaw
      const driftYaw = this.handbrakeActive
        ? angularVel * (1 + this.skidIntensity * 1.4)
        : angularVel;

      this.heading += Math.sign(this.steerAngle) * driftYaw * fwdSign * dt;
    }

    this.root.rotation.y = this.heading;

    // ── 5. POSITION ───────────────────────────────────────────────────────
    const fwdX = -Math.sin(this.heading);
    const fwdZ = -Math.cos(this.heading);
    const worldSpd = (this.speed / 3.6) * CFG.worldScale;

    this.root.position.x += fwdX * worldSpd * dt;
    this.root.position.z += fwdZ * worldSpd * dt;

    // ── 6. TERRAIN FOLLOW + SUSPENSION ────────────────────────────────────
    const groundY = this._getGroundHeight(
      this.root.position.x, this.root.position.z
    );
    const targetY = groundY + CFG.suspensionHeight;
    const diff    = targetY - this.root.position.y;

    // Spring + damper
    this.suspVelocity += diff * CFG.suspensionStiff * dt;
    this.suspVelocity *= Math.pow(CFG.suspensionDamp, dt * 60);
    this.root.position.y += this.suspVelocity * dt;
    this.root.position.y  = Math.max(groundY + 0.3, this.root.position.y);

    // Check if on slope — pitch body
    const hFwd  = this._getGroundHeight(
      this.root.position.x + fwdX * 2,
      this.root.position.z + fwdZ * 2
    );
    const hBack = this._getGroundHeight(
      this.root.position.x - fwdX * 2,
      this.root.position.z - fwdZ * 2
    );
    const slopePitch = Math.atan2(hFwd - hBack, 4) * 0.6;

    // Body roll + pitch on bodyNode
    const targetRoll  = -this.steerAngle * CFG.rollFactor * Math.min(speedAbs / 30, 1);
    const targetPitch = slopePitch - brake * CFG.pitchFactor + throttle * CFG.pitchFactor * 0.4;
    this.bodyRoll  += (targetRoll  - this.bodyRoll)  * Math.min(dt * 5, 1);
    this.bodyPitch += (targetPitch - this.bodyPitch) * Math.min(dt * 4, 1);

    this._bodyNode.rotation.z = this.bodyRoll;
    this._bodyNode.rotation.x = this.bodyPitch;

    // ── 7. WHEEL ANIMATION ────────────────────────────────────────────────
    const wheelCirc = Math.PI * 0.84;
    const spinRate  = (worldSpd / wheelCirc) * (Math.PI * 2);
    this._wheelNodes.forEach((node, i) => {
      if (!node) return;
      this.wheelSpin[i] = (this.wheelSpin[i] || 0) + spinRate * dt;
      if (node.isFront) {
        node.rotation.y = this.steerAngle;
      }
      const wx = this.root.position.x + Math.cos(this.heading) * (i < 2 ? -1.6 : 1.5);
      const wz = this.root.position.z + Math.sin(this.heading) * (i < 2 ? -1.6 : 1.5);
      const wGround = this._getGroundHeight(wx, wz);
      const wTarget = wGround - this.root.position.y + CFG.suspensionHeight;
      node.position.y = Math.max(0.1, wTarget);
    });

    // ── 8. GEARBOX + AUDIO ────────────────────────────────────────────────
    this._updateGearbox(dt);
    this._updateAudio(dt);
  }

  _getGroundHeight(x, z) {
    try {
      if (this.terrain && this.terrain.getHeightAtCoordinates) {
        const h = this.terrain.getHeightAtCoordinates(x, z);
        return (h == null || isNaN(h)) ? 0 : h;
      }
    } catch(e) {}
    return 0;
  }

  getSpeed()  { return Math.round(Math.abs(this.speed)); }
  getGear()   {
    if (this.speed < -0.5) return 'R';
    const g = ['N','1','2','3','4','5'];
    return g[this.gear] || 'D';
  }
  getRpm()    { return Math.round(this.engineRpm); }
  isSkidding(){ return this.skidding; }
}