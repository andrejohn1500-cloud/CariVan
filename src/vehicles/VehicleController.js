import '@babylonjs/loaders/glTF';
import {
  MeshBuilder, StandardMaterial, Color3, Vector3,
  TransformNode, SceneLoader
} from '@babylonjs/core';
import { EngineSound } from '../audio/EngineSound.js';

export class VehicleController {
  constructor(scene, terrain, startPos, roadSystem, profile) {
    this.scene      = scene;
    this.terrain    = terrain;
    this.roadSystem = roadSystem || null;
    this.profile    = profile;

    // ── Driving state ───────────────────────────────────────────────────────
    this.speed        = 0;
    this.steerAngle   = 0;
    this.heading      = 0;
    this.bodyRoll     = 0;
    this.suspVelocity = 0;
    this.engineRpm    = 800;
    this.gear         = 1;
    this.wheelSpin    = [0, 0, 0, 0];
    this.skidding     = false;

    this.roadDist = 0;
    this.lateral  = -30;
    this.offRoad  = false;

    this.input = {
      throttle: 0, brake: 0,
      steerL: 0, steerR: 0,
      handbrake: 0,
    };

    this._keys      = {};
    this._joystickX = 0;
    this._joystickY = 0;

    // ── Build node hierarchy ────────────────────────────────────────────────
    this.root = new TransformNode('vehRoot', scene);
    this.root.position = startPos ? startPos.clone() : new Vector3(0, 4, 0);

    this._bodyNode = new TransformNode('vehBody', scene);
    this._bodyNode.parent = this.root;

    this._wheelNodes  = [];
    this._wheelMeshes = [];
    this._glbLoaded   = false;

    this._buildWheels();
    this._tryLoadGLB();
    this._setupInput();
    this._initAudio();

    this.mesh = this.root;
  }

  _tryLoadGLB() {
    const p = this.profile;
    SceneLoader.ImportMeshAsync('', './assets/', p.glb, this.scene)
      .then(result => {
        result.meshes.forEach(m => {
          m.parent = this._bodyNode;
          m.receiveShadows = true;
        });
        this._bodyNode.rotation.x = p.bodyRotX;
        this._bodyNode.rotation.y = p.bodyRotY;
        this._bodyNode.rotation.z = p.bodyRotZ;
        this._bodyNode.scaling    = new Vector3(p.scale, p.scale, p.scale);
        this._bodyNode.position.y = p.suspensionHeight;
        this._wheelNodes.forEach(n => { if (n) n.setEnabled(false); });
        this._glbLoaded = true;
        console.log('[CariVan] Vehicle loaded:', p.name);
      })
      .catch(err => {
        console.warn('[CariVan] GLB load failed:', err);
        this._buildProceduralBody();
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

  _buildProceduralBody() {
    const sc = this.scene;
    const root = this._bodyNode;
    const bodyMat   = this._mat('body',   '#ECECE8', 0.25);
    const glassMat  = this._mat('glass',  '#1A2B3C', 0.60);
    const chromeMat = this._mat('chrome', '#C0C0C0', 0.90);
    const mk = (n, w, h, d, x, y, z, mat) => {
      const b = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, sc);
      b.material = mat;
      b.position.set(x, y, z);
      b.parent = root;
      return b;
    };
    mk('body',    2.1, 2.1, 5.0,  0, 1.2,     0, bodyMat);
    mk('screen',  1.75,1.0, 0.06, 0, 1.75, -2.53, glassMat);
    mk('fBumper', 2.2, 0.22,0.2,  0, 0.35, -2.72, chromeMat);
    mk('rBumper', 2.2, 0.22,0.2,  0, 0.35,  2.62, chromeMat);
    root.position.y = this.profile.suspensionHeight;
  }

  _buildWheels() {
    const sc = this.scene;
    const tireMat = this._mat('tire', '#1A1A1A', 0.05);
    const rimMat  = this._mat('rim',  '#C9A84C', 0.80);
    const positions = [
      { x: -1.12, z: -1.6, front: true  },
      { x:  1.12, z: -1.6, front: true  },
      { x: -1.12, z:  1.5, front: false },
      { x:  1.12, z:  1.5, front: false },
    ];
    positions.forEach((pos, i) => {
      const node = new TransformNode('wheelNode' + i, sc);
      node.parent = this.root;
      node.position = new Vector3(pos.x, this.profile.suspensionHeight, pos.z);
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
    this._engineSound = new EngineSound(this.profile.engineSound || 'car');
    document.addEventListener('touchstart', () => {
      this._engineSound.start();
    }, { once: true });
  }

  honk() {
    if (this._engineSound) this._engineSound.honk();
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

    this.input.throttle  = Math.max(kThrottle, jThrottle);
    this.input.brake     = Math.max(kBrake,    jBrake);
    this.input.steerL    = Math.max(kSteerL,   jSteerL);
    this.input.steerR    = Math.max(kSteerR,   jSteerR);
    this.input.handbrake = Math.max(this.input.handbrake, kHB);
  }

  update(deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const p  = this.profile;
    this._buildInput();

    const { throttle, brake, steerL, steerR, handbrake } = this.input;
    const speedAbs = Math.abs(this.speed);
    const speedMs  = this.speed / 3.6;
    const fwdSign  = this.speed >= 0 ? 1 : -1;

    // ── Speed ──────────────────────────────────────────────────────────────
    if (handbrake > 0) {
      this.speed -= Math.sign(this.speed) * p.handbrakeForce * dt;
    } else if (brake > 0) {
      if (this.speed > 0.5)
        this.speed -= p.footBrake * brake * dt;
      else if (this.speed > -p.reverseSpeedKph)
        this.speed -= p.engineTorque * 0.6 * brake * dt;
    } else if (throttle > 0) {
      if (this.speed < p.topSpeedKph)
        this.speed += p.engineTorque * throttle * dt;
    } else {
      const eb = p.engineBrake * dt;
      if (Math.abs(this.speed) < eb) this.speed = 0;
      else this.speed -= Math.sign(this.speed) * eb;
    }
    this.speed = Math.max(-p.reverseSpeedKph,
                          Math.min(p.topSpeedKph, this.speed));

    // ── Road movement ──────────────────────────────────────────────────────
    if (this.roadSystem) {
      const latInput = steerR - steerL;
      const speedFactor = Math.min(Math.abs(this.speed) / 40, 1.0);
      const naturalDrift = Math.abs(this.speed) > 2 ? -8 * speedFactor * dt : 0;
      const steerForce = latInput * 55 * dt;

      this.lateral += steerForce + (latInput === 0 ? naturalDrift : 0);
      this.lateral = Math.max(-95, Math.min(95, this.lateral));

      if (latInput === 0 && this.lateral < -45 && speedFactor > 0.1) {
        this.lateral += 4 * speedFactor * dt;
      }

      this.offRoad = Math.abs(this.lateral) > 92;

      const worldSpd = (this.speed / 3.6) * p.worldScale;
      this.roadDist += worldSpd * dt;
      if (this.roadDist >= this.roadSystem.totalLength)
        this.roadDist -= this.roadSystem.totalLength;
      if (this.roadDist < 0)
        this.roadDist += this.roadSystem.totalLength;

      const { position, heading } =
        this.roadSystem.getCarTransform(this.roadDist, this.lateral);
      this.root.position.copyFrom(position);
      this.heading = heading;
      this.root.rotation.y = heading;

    } else {
      // Free roam fallback
      const steerInput = steerR - steerL;
      const steerBlend = Math.min(speedAbs / p.steerSpeedBlend, 1);
      const steerRate  = p.steerSpeedLow +
        (p.steerSpeedHigh - p.steerSpeedLow) * steerBlend;
      const steerMax   = p.steerMaxRad * (1 - steerBlend * 0.45);

      if (steerInput !== 0) {
        this.steerAngle += steerInput * steerRate * dt;
        this.steerAngle  = Math.max(-steerMax,
                                     Math.min(steerMax, this.steerAngle));
      } else {
        const ret = p.steerReturnRate * dt;
        if (Math.abs(this.steerAngle) < ret) this.steerAngle = 0;
        else this.steerAngle -= Math.sign(this.steerAngle) * ret;
      }

      const moving = speedAbs > 0.5;
      if (moving) {
        const wheelBase  = 2.8 * p.worldScale;
        const turnRadius = wheelBase /
          Math.tan(Math.abs(this.steerAngle) + 0.0001);
        const angularVel = (speedMs * p.worldScale) / turnRadius;
        this.heading += Math.sign(this.steerAngle) *
                        angularVel * fwdSign * dt;
      }

      this.root.rotation.y = this.heading;
      const fwdX     = Math.sin(this.heading);
      const fwdZ     = Math.cos(this.heading);
      const worldSpd = (this.speed / 3.6) * p.worldScale;
      this.root.position.x += fwdX * worldSpd * dt;
      this.root.position.z += fwdZ * worldSpd * dt;

      const groundY = this._getGroundHeight(
        this.root.position.x, this.root.position.z);
      const targetY = groundY + p.suspensionHeight;
      const diff    = targetY - this.root.position.y;
      this.suspVelocity += diff * 12 * dt;
      this.suspVelocity *= Math.pow(0.72, dt * 60);
      this.root.position.y += this.suspVelocity * dt;
      this.root.position.y  = Math.max(groundY + 0.3,
                                        this.root.position.y);
    }

    // ── Body roll ──────────────────────────────────────────────────────────
    const latInput2  = steerR - steerL;
    const targetRoll = -latInput2 * p.rollFactor *
                        Math.min(speedAbs / 30, 1);
    this.bodyRoll += (targetRoll - this.bodyRoll) * Math.min(dt * 5, 1);
    this._bodyNode.rotation.z = this.bodyRoll;

    // ── Wheels ─────────────────────────────────────────────────────────────
    const worldSpd2 = (this.speed / 3.6) * p.worldScale;
    const wheelCirc = Math.PI * 0.84;
    const spinRate  = (worldSpd2 / wheelCirc) * (Math.PI * 2);
    this._wheelNodes.forEach((node, i) => {
      if (!node) return;
      this.wheelSpin[i] = (this.wheelSpin[i] || 0) + spinRate * dt;
      if (node.isFront) node.rotation.y = this.steerAngle;
      if (this._wheelMeshes[i])
        this._wheelMeshes[i].rotation.x = this.wheelSpin[i];
    });

    // ── Engine audio ───────────────────────────────────────────────────────
    if (this._engineSound) {
      this._engineSound.setSpeed(Math.abs(this.speed));
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