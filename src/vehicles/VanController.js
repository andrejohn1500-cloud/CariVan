import '@babylonjs/loaders/glTF';
import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, SceneLoader
} from '@babylonjs/core';

const CFG = {
  topSpeedKph: 95,
  reverseSpeedKph: 25,
  engineTorque: 18,
  engineBrake: 6,
  footBrake: 38,
  handbrakeForce: 55,
  steerMaxRad: 0.58,
  steerSpeedLow: 2.8,
  steerSpeedHigh: 1.1,
  steerReturnRate: 5.5,
  steerSpeedBlend: 80,
  suspensionHeight: 0.52,
  rollFactor: 0.04,
  worldScale: 10,
};

export class VanController {
  constructor(scene, terrain, startPos) {
    this.scene = scene;
    this.terrain = terrain;
    this.speed = 0;
    this.steerAngle = 0;
    this.heading = 0;
    this.bodyRoll = 0;
    this.suspVelocity = 0;
    this.engineRpm = 800;
    this.gear = 1;
    this.wheelSpin = [0, 0, 0, 0];
    this.skidding = false;

    this.input = {
      throttle: 0, brake: 0,
      steerL: 0, steerR: 0,
      handbrake: 0,
    };

    this._keys = {};
    this._joystickX = 0;
    this._joystickY = 0;

    this.root = new TransformNode('vanRoot', scene);
    this.root.position = startPos ? startPos.clone() : new Vector3(0, 4, 0);

    this._bodyNode = new TransformNode('vanBody', scene);
    this._bodyNode.parent = this.root;

    this._wheelNodes = [];
    this._wheelMeshes = [];
    this._glbLoaded = false;

    this._buildWheels();
    this._tryLoadGLB();
    this._setupInput();
    this._initAudio();

    this.mesh = this.root;
  }

  _tryLoadGLB() {
    SceneLoader.ImportMeshAsync('', './assets/', 'suzuki_swift.glb', this.scene)
      .then(result => {
        result.meshes.forEach(m => {
          m.parent = this._bodyNode;
          m.receiveShadows = true;
        });
        this._bodyNode.rotation.y = 0;
        this._bodyNode.rotation.x = 0;
        this._bodyNode.rotation.z = 0;
        this._bodyNode.scaling = new Vector3(1, 1, 1);
        this._bodyNode.position.y = CFG.suspensionHeight;
        this._wheelNodes.forEach(n => { if (n) n.setEnabled(false); });
        this._glbLoaded = true;
        console.log('subaru loaded');
      })
      .catch(err => {
        console.warn('GLB not found:', err);
        this._buildProceduralVan();
      });
  }

  _mat(n, hex, spec = 0.15) {
    const m = new StandardMaterial(n + '_mat', this.scene);
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    m.diffuseColor = new Color3(r, g, b);
    m.specularColor = new Color3(spec, spec, spec);
    return m;
  }

  _buildProceduralVan() {
    const sc = this.scene;
    const root = this._bodyNode;
    const bodyMat = this._mat('body', '#ECECE8', 0.25);
    const glassMat = this._mat('glass', '#1A2B3C', 0.60);
    const chromeMat = this._mat('chrome', '#C0C0C0', 0.90);
    const mk = (n, w, h, d, x, y, z, mat) => {
      const b = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, sc);
      b.material = mat;
      b.position.set(x, y, z);
      b.parent = root;
      return b;
    };
    mk('body', 2.1, 2.1, 5.0, 0, 1.2, 0, bodyMat);
    mk('screen', 1.75, 1.0, 0.06, 0, 1.75, -2.53, glassMat);
    mk('fBumper', 2.2, 0.22, 0.2, 0, 0.35, -2.72, chromeMat);
    mk('rBumper', 2.2, 0.22, 0.2, 0, 0.35, 2.62, chromeMat);
    root.position.y = CFG.suspensionHeight;
  }

  _buildWheels() {
    const sc = this.scene;
    const tireMat = this._mat('tire', '#1A1A1A', 0.05);
    const rimMat = this._mat('rim', '#C9A84C', 0.80);
    const positions = [
      { x: -1.12, z: -1.6, front: true },
      { x: 1.12, z: -1.6, front: true },
      { x: -1.12, z: 1.5, front: false },
      { x: 1.12, z: 1.5, front: false },
    ];
    positions.forEach((pos, i) => {
      const node = new TransformNode('wheelNode' + i, sc);
      node.parent = this.root;
      node.position = new Vector3(pos.x, CFG.suspensionHeight, pos.z);
      node.isFront = pos.front;
      const tire = MeshBuilder.CreateCylinder('tire' + i, {
        diameter: 0.84, height: 0.38, tessellation: 24
      }, sc);
      tire.material = tireMat;
      tire.rotation.z = Math.PI / 2;
      tire.parent = node;
      const rim = MeshBuilder.CreateCylinder('rim' + i, {
        diameter: 0.52, height: 0.39, tessellation: 18
      }, sc);
      rim.material = rimMat;
      rim.rotation.z = Math.PI / 2;
      rim.parent = node;
      this._wheelNodes.push(node);
      this._wheelMeshes.push(tire);
    });
  }

  _setupInput() {
    window.addEventListener('keydown', e => {
      this._keys[e.key] = true;
      if (e.key === ' ') { e.preventDefault(); this.honk(); }
    });
    window.addEventListener('keyup', e => {
      this._keys[e.key] = false;
    });
  }

  setJoystick(nx, ny) {
    this._joystickX = nx;
    this._joystickY = ny;
  }

  setHandbrake(v) { this.input.handbrake = v ? 1 : 0; }

  _initAudio() {
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioCtx;
      this._engineOsc = ctx.createOscillator();
      this._engineGain = ctx.createGain();
      this._engineOsc.type = 'sawtooth';
      this._engineOsc.frequency.value = 60;
      this._engineOsc.connect(this._engineGain);
      this._engineGain.connect(ctx.destination);
      this._engineGain.gain.value = 0.04;
      this._engineOsc.start();
    } catch (e) { }
  }

  honk() {
    try {
      if (!this._audioCtx) return;
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(390, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.13);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) { }
  }

  _buildInput() {
    const k = this._keys;
    const kThrottle = (k['ArrowUp']    || k['w'] || k['W']) ? 1 : 0;
    const kBrake    = (k['ArrowDown']  || k['s'] || k['S']) ? 1 : 0;
    const kSteerL   = (k['ArrowLeft']  || k['a'] || k['A']) ? 1 : 0;
    const kSteerR   = (k['ArrowRight'] || k['d'] || k['D']) ? 1 : 0;
    const kHB       = (k['Shift']      || k['e'] || k['E']) ? 1 : 0;

    const jThrottle = Math.max(0, -this._joystickY);
    const jBrake    = Math.max(0,  this._joystickY);
    const jSteerL   = Math.max(0, -this._joystickX);
    const jSteerR   = Math.max(0,  this._joystickX);

    this.input.throttle  = Math.max(kThrottle,  jThrottle);
    this.input.brake     = Math.max(kBrake,     jBrake);
    this.input.steerL    = Math.max(kSteerL,    jSteerL);
    this.input.steerR    = Math.max(kSteerR,    jSteerR);
    this.input.handbrake = Math.max(this.input.handbrake, kHB);
  }

  update(deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    this._buildInput();

    const { throttle, brake, steerL, steerR, handbrake } = this.input;
    const speedAbs = Math.abs(this.speed);
    const speedMs  = this.speed / 3.6;
    const moving   = speedAbs > 0.5;
    const fwdSign  = this.speed >= 0 ? 1 : -1;

    const steerInput = steerR - steerL;
    const steerBlend = Math.min(speedAbs / CFG.steerSpeedBlend, 1);
    const steerRate  = CFG.steerSpeedLow + (CFG.steerSpeedHigh - CFG.steerSpeedLow) * steerBlend;
    const steerMax   = CFG.steerMaxRad * (1 - steerBlend * 0.45);

    if (steerInput !== 0) {
      this.steerAngle += steerInput * steerRate * dt;
      this.steerAngle = Math.max(-steerMax, Math.min(steerMax, this.steerAngle));
    } else {
      const ret = CFG.steerReturnRate * dt;
      if (Math.abs(this.steerAngle) < ret) this.steerAngle = 0;
      else this.steerAngle -= Math.sign(this.steerAngle) * ret;
    }

    if (handbrake > 0) {
      this.speed -= Math.sign(this.speed) * CFG.handbrakeForce * dt;
    } else if (brake > 0) {
      if (this.speed > 0.5) this.speed -= CFG.footBrake * brake * dt;
      else if (this.speed > -CFG.reverseSpeedKph) this.speed -= CFG.engineTorque * 0.6 * brake * dt;
    } else if (throttle > 0) {
      if (this.speed < CFG.topSpeedKph) this.speed += CFG.engineTorque * throttle * dt;
    } else {
      const eb = CFG.engineBrake * dt;
      if (Math.abs(this.speed) < eb) this.speed = 0;
      else this.speed -= Math.sign(this.speed) * eb;
    }

    this.speed = Math.max(-CFG.reverseSpeedKph, Math.min(CFG.topSpeedKph, this.speed));

    if (moving) {
      const wheelBase  = 2.8 * CFG.worldScale;
      const turnRadius = wheelBase / Math.tan(Math.abs(this.steerAngle) + 0.0001);
      const angularVel = (speedMs * CFG.worldScale) / turnRadius;
      this.heading += Math.sign(this.steerAngle) * angularVel * fwdSign * dt;
    }

    this.root.rotation.y = this.heading;

    const fwdX     = Math.sin(this.heading);
    const fwdZ     = Math.cos(this.heading);
    const worldSpd = (this.speed / 3.6) * CFG.worldScale;

    this.root.position.x += fwdX * worldSpd * dt;
    this.root.position.z += fwdZ * worldSpd * dt;

    const groundY = this._getGroundHeight(this.root.position.x, this.root.position.z);
    const targetY = groundY + CFG.suspensionHeight;
    const diff    = targetY - this.root.position.y;
    this.suspVelocity += diff * 12 * dt;
    this.suspVelocity *= Math.pow(0.72, dt * 60);
    this.root.position.y += this.suspVelocity * dt;
    this.root.position.y  = Math.max(groundY + 0.3, this.root.position.y);

    const targetRoll = -this.steerAngle * CFG.rollFactor * Math.min(speedAbs / 30, 1);
    this.bodyRoll += (targetRoll - this.bodyRoll) * Math.min(dt * 5, 1);
    this._bodyNode.rotation.z = this.bodyRoll;

    const wheelCirc = Math.PI * 0.84;
    const spinRate  = (worldSpd / wheelCirc) * (Math.PI * 2);
    this._wheelNodes.forEach((node, i) => {
      if (!node) return;
      this.wheelSpin[i] = (this.wheelSpin[i] || 0) + spinRate * dt;
      if (node.isFront) node.rotation.y = this.steerAngle;
      if (this._wheelMeshes[i]) this._wheelMeshes[i].rotation.x = this.wheelSpin[i];
    });

    if (this._audioCtx && this._engineOsc) {
      const freq = 45 + (this.engineRpm || 800) * 0.055;
      this._engineOsc.frequency.setTargetAtTime(freq, this._audioCtx.currentTime, 0.08);
    }
  }

  _getGroundHeight(x, z) {
    try {
      if (this.terrain && this.terrain.getHeightAtCoordinates) {
        const h = this.terrain.getHeightAtCoordinates(x, z);
        return (h == null || isNaN(h)) ? 0 : h;
      }
    } catch (e) { }
    return 0;
  }

  getSpeed()   { return Math.round(Math.abs(this.speed)); }
  getGear()    {
    if (this.speed < -0.5) return 'R';
    return ['N','1','2','3','4','5'][this.gear] || 'D';
  }
  getRpm()     { return Math.round(this.engineRpm || 800); }
  isSkidding() { return this.skidding; }
}