import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, SceneLoader
} from '@babylonjs/core';
import { GLTFFileLoader } from '@babylonjs/loaders/glTF/2.0/glTFFileLoader.js';

// Register GLB/GLTF loader plugin
SceneLoader.RegisterPlugin(new GLTFFileLoader());

// ─────────────────────────────────────────────────────────────────────────────
//  CariVan — Advanced GTA-Style Van Controller
//  Nissan Caravan E25 · St. Vincent & the Grenadines 🇻🇨
// ─────────────────────────────────────────────────────────────────────────────

const CFG = {
  topSpeedKph:        95,
  reverseSpeedKph:    25,
  engineTorque:       18,
  engineBrake:        6,
  footBrake:          38,
  handbrakeForce:     55,
  tractionFull:       1.0,
  tractionHandbrake:  0.18,
  tractionLow:        0.55,
  lateralFriction:    0.82,
  driftThreshold:     62,
  steerMaxRad:        0.58,
  steerSpeedLow:      2.8,
  steerSpeedHigh:     1.1,
  steerReturnRate:    5.5,
  steerSpeedBlend:    80,
  suspensionHeight:   0.52,
  suspensionStiff:    12,
  suspensionDamp:     0.72,
  rollFactor:         0.04,
  pitchFactor:        0.025,
  mass:               2100,
  cgHeight:           1.1,
  worldScale:         10,
};

export class VanController {
  constructor(scene, terrain, startPos) {
    this.scene   = scene;
    this.terrain = terrain;

    this.velocity        = Vector3.Zero();
    this.speed           = 0;
    this.steerAngle      = 0;
    this.heading         = 0;
    this.bodyRoll        = 0;
    this.bodyPitch       = 0;
    this.suspOffset      = 0;
    this.suspVelocity    = 0;
    this.engineRpm       = 800;
    this.gear            = 1;
    this.handbrakeActive = false;
    this.onGround        = true;
    this.skidding        = false;
    this.skidIntensity   = 0;
    this.wheelSpin       = [0, 0, 0, 0];
    this.wheelSteer      = [0, 0, 0, 0];

    this.input = {
      throttle: 0, brake: 0,
      steerL: 0, steerR: 0,
      handbrake: 0, horn: false,
    };

    this._audioCtx   = null;
    this._engineOsc  = null;
    this._engineGain = null;
    this._skidGain   = null;

    this.root = new TransformNode('vanRoot', scene);
    this.root.position = startPos ? startPos.clone() : new Vector3(0, 4, 0);

    this._bodyNode = new TransformNode('vanBody', scene);
    this._bodyNode.parent = this.root;

    this._wheelNodes  = [];
    this._wheelMeshes = [];

    this._tryLoadGLB();
    this._buildWheels();
    this._setupInput();
    this._initAudio();

    this.mesh = this.root;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GLB LOADER
  // ═══════════════════════════════════════════════════════════════════════
  _tryLoadGLB() {
    SceneLoader.ImportMeshAsync('', './assets/', 'van_caravan.glb', this.scene)
      .then(result => {
        result.meshes.forEach(m => {
          m.parent = this._bodyNode;
          m.receiveShadows = true;
        });
        this._bodyNode.rotation.y = Math.PI;
        const scale = (4.7 * CFG.worldScale) / 47;
        this._bodyNode.scaling = new Vector3(scale, scale, scale);
        this._bodyNode.position.y = CFG.suspensionHeight;
        console.log('✅ van_caravan.glb loaded');
      })
      .catch(err => {
        console.warn('GLB not found — using procedural van:', err);
        this._buildProceduralVan();
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PROCEDURAL VAN FALLBACK
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
    mk('cabWR', 0.65,0.5,0.05,-1.75,1.75, 1.06, glassMat);
    mk('cabWL', 0.65,0.5,0.05,-1.75,1.75,-1.06, glassMat);
    root.position.y = CFG.suspensionHeight;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  WHEELS
  // ═══════════════════════════════════════════════════════════════════════
  _buildWheels() {
    const sc      = this.scene;
    const tireMat = this._mat('tire', '#1A1A1A', 0.05);
    const rimMat  = this._mat('rim',  '#C9A84C', 0.80);
    const hubMat  = this._mat('hub',  '#C0C0C0', 0.90);

    const positions = [
      { x: -1.6, z:  1.12, front: true  },
      { x: -1.6, z: -1.12, front: true  },
      { x:  1.5, z:  1.12, front: false },
      { x:  1.5, z: -1.12, front: false },
    ];

    positions.forEach((pos, i) => {
      const node = new TransformNode('wheelNode'+i, sc);
      node.parent   = this.root;
      node.position = new Vector3(pos.x, CFG.suspensionHeight, pos.z);
      node.isFront  = pos.front;

      const tire = MeshBuilder.CreateCylinder('tire'+i, {
        diameter: 0.84, height: 0.38, tessellation: 24
      }, sc);
      tire.material   = tireMat;
      tire.rotation.z = Math.PI / 2;
      tire.parent     = node;

      const rim = MeshBuilder.CreateCylinder('rim'+i, {
        diameter: 0.52, height: 0.39, tessellation: 18
      }, sc);
      rim.material   = rimMat;
      rim.rotation.z = Math.PI / 2;
      rim.parent     = node;

      const hub = MeshBuilder.CreateCylinder('hub'+i, {
        diameter: 0.16, height: 0.40, tessellation: 8
      }, sc);
      hub.material   = hubMat;
      hub.rotation.z = Math.PI / 2;
      hub.parent     = node;

      this._wheelNodes.push(node);
      this._wheelMeshes.push(tire);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  INPUT
  // ═══════════════════════════════════════════════════════════════════════
  _setupInput() {
    const keys = {};
    window.addEventListener('keydown', e => {
      keys[e.key] = true;
      if (e.key === ' ') { e.preventDefault(); this.honk(); }
      if (e.key === 'h' || e.key === 'H') this.honk();
    });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    this._pollKeys = () => {
      this.input.throttle  = (keys['ArrowUp']    || keys['w'] || keys['W']) ? 1 : 0;
      this.input.brake     = (keys['ArrowDown']  || keys['s'] || keys['S']) ? 1 : 0;
      this.input.steerL    = (keys['ArrowLeft']  || keys['a'] || keys['A']) ? 1 : 0;
      this.input.steerR    = (keys['ArrowRight'] || keys['d'] || keys['D']) ? 1 : 0;
      this.input.handbrake = (keys['Shift']      || keys['e'] || keys['E']) ? 1 : 0;
    };
  }

  setJoystick(nx, ny) {
    this.input.throttle  = Math.max(0, -ny);
    this.input.brake     = Math.max(0,  ny);
    this.input.steerL    = Math.max(0, -nx);
    this.input.steerR    = Math.max(0,  nx);
  }

  setHandbrake(v) { this.input.handbrake = v ? 1 : 0; }

  // ═══════════════════════════════════════════════════════════════════════
  //  AUDIO
  // ═══════════════════════════════════════════════════════════════════════
  _initAudio() {
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;

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
    const baseFreq = 45 + this.engineRpm * 0.055;
    this._engineOsc.frequency.setTargetAtTime(baseFreq, ctx.currentTime, 0.08);
    this._engineGain.gain.setTargetAtTime(
      0.03 + this.input.throttle * 0.06, ctx.currentTime, 0.05
    );
    if (this._skidGain) {
      const skidVol = this.skidding ? Math.min(this.skidIntensity * 0.18, 0.22) : 0;
      this._skidGain.gain.setTargetAtTime(skidVol, ctx.currentTime, 0.04);
    }
  }

  honk() {
    try {
      if (!this._audioCtx) return;
      const ctx = this._audioCtx;
      const osc  = ctx.createOscillator();
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
  //  GEARBOX
  // ═══════════════════════════════════════════════════════════════════════
  _updateGearbox(dt) {
    const spd = Math.abs(this.speed);
    const gearRanges = [0, 15, 30, 50, 72, 95];
    let targetGear = 1;
    for (let g = 1; g < gearRanges.length; g++) {
      if (spd > gearRanges[g - 1]) targetGear = g;
    }
    if (this.speed < 0) targetGear = 0;
    this.gear = targetGear;

    const gearRatio = [3.5, 3.0, 2.1, 1.4, 1.0, 0.75][this.gear] || 1.0;
    const targetRpm = 800 + (spd / CFG.topSpeedKph) * gearRatio * 5200;
    this.engineRpm += (targetRpm - this.engineRpm) * Math.min(dt * 4, 1);
    this.engineRpm  = Math.max(750, Math.min(6800, this.engineRpm));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  MAIN PHYSICS UPDATE
  // ═══════════════════════════════════════════════════════════════════════
  update(deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);

    if (this._pollKeys) this._pollKeys();

    const { throttle, brake, steerL, steerR, handbrake } = this.input;
    const speedKph = this.speed;
    const speedAbs = Math.abs(speedKph);
    const speedMs  = speedKph / 3.6;
    const moving   = speedAbs > 0.5;
    const fwdSign  = speedKph >= 0 ? 1 : -1;

    // ── 1. STEERING ──────────────────────────────────────────────────────
    const steerInput = steerR - steerL;
    const steerBlend = Math.min(speedAbs / CFG.steerSpeedBlend, 1);
    const steerRate  = CFG.steerSpeedLow + (CFG.steerSpeedHigh - CFG.steerSpeedLow) * steerBlend;
    const steerMax   = CFG.steerMaxRad * (1 - steerBlend * 0.45);

    if (steerInput !== 0) {
      this.steerAngle += steerInput * steerRate * dt;
      this.steerAngle  = Math.max(-steerMax, Math.min(steerMax, this.steerAngle));
    } else {
      const returnSpeed = CFG.steerReturnRate * dt;
      if (Math.abs(this.steerAngle) < returnSpeed) {
        this.steerAngle = 0;
      } else {
        this.steerAngle -= Math.sign(this.steerAngle) * returnSpeed;
      }
    }

    // ── 2. THROTTLE / BRAKE / HANDBRAKE ──────────────────────────────────
    this.handbrakeActive = handbrake > 0;

    if (this.handbrakeActive) {
      this.speed -= Math.sign(speedKph) * CFG.handbrakeForce * dt;
    } else if (brake > 0) {
      if (speedKph > 0.5) {
        this.speed -= CFG.footBrake * brake * dt;
      } else if (speedKph > -CFG.reverseSpeedKph) {
        this.speed -= CFG.engineTorque * 0.6 * brake * dt;
      }
    } else if (throttle > 0) {
      if (speedKph < CFG.topSpeedKph) {
        const rpmFactor = 1 - Math.pow((this.engineRpm - 3500) / 3500, 2) * 0.3;
        this.speed += CFG.engineTorque * throttle * Math.max(0.4, rpmFactor) * dt;
      }
    } else {
      const eb = CFG.engineBrake * dt;
      if (Math.abs(speedKph) < eb) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(speedKph) * eb;
      }
    }

    this.speed = Math.max(-CFG.reverseSpeedKph, Math.min(CFG.topSpeedKph, this.speed));

    // ── 3. TRACTION & DRIFT ───────────────────────────────────────────────
    const lateralForce = Math.abs(this.steerAngle) * speedAbs;
    this.skidding      = lateralForce > CFG.driftThreshold * 0.4 || this.handbrakeActive;
    this.skidIntensity = Math.max(0, lateralForce / CFG.driftThreshold - 0.3);

    // ── 4. YAW ───────────────────────────────────────────────────────────
    if (moving) {
      const wheelBase  = 2.8 * CFG.worldScale;
      const turnRadius = wheelBase / Math.tan(Math.abs(this.steerAngle) + 0.0001);
      const angularVel = (speedMs * CFG.worldScale) / turnRadius;
      const driftYaw   = this.handbrakeActive
        ? angularVel * (1 + this.skidIntensity * 1.4)
        : angularVel;
      this.heading += Math.sign(this.steerAngle) * driftYaw * fwdSign * dt;
    }

    this.root.rotation.y = this.heading;

    // ── 5. POSITION — FIXED FORWARD DIRECTION ────────────────────────────
    const fwdX   = Math.sin(this.heading);
    const fwdZ   = Math.cos(this.heading);
    const worldSpd = (this.speed / 3.6) * CFG.worldScale;

    this.root.position.x += fwdX * worldSpd * dt;
    this.root.position.z += fwdZ * worldSpd * dt;

    // ── 6. TERRAIN + SUSPENSION ───────────────────────────────────────────
    const groundY = this._getGroundHeight(this.root.position.x, this.root.position.z);
    const targetY = groundY + CFG.suspensionHeight;
    const diff    = targetY - this.root.position.y;

    this.suspVelocity += diff * CFG.suspensionStiff * dt;
    this.suspVelocity *= Math.pow(CFG.suspensionDamp, dt * 60);
    this.root.position.y += this.suspVelocity * dt;
    this.root.position.y  = Math.max(groundY + 0.3, this.root.position.y);

    const hFwd  = this._getGroundHeight(
      this.root.position.x + fwdX * 2,
      this.root.position.z + fwdZ * 2
    );
    const hBack = this._getGroundHeight(
      this.root.position.x - fwdX * 2,
      this.root.position.z - fwdZ * 2
    );
    const slopePitch = Math.atan2(hFwd - hBack, 4) * 0.6;

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
      if (node.isFront) node.rotation.y = this.steerAngle;
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

  getSpeed()   { return Math.round(Math.abs(this.speed)); }
  getGear()    {
    if (this.speed < -0.5) return 'R';
    const g = ['N','1','2','3','4','5'];
    return g[this.gear] || 'D';
  }
  getRpm()     { return Math.round(this.engineRpm); }
  isSkidding() { return this.skidding; }
}