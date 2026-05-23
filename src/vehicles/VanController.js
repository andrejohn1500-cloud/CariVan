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

  _buildVanMesh(position) {
    const body = MeshBuilder.CreateBox('van_body', { width: 2.2, height: 1.8, depth: 5.0 }, this.scene);
    body.position = position.clone();
    body.position.y += 1.2;

    const rack = MeshBuilder.CreateBox('van_rack', { width: 2.0, height: 0.08, depth: 4.6 }, this.scene);
    rack.parent = body;
    rack.position.y = 0.94;

    const wheelPositions = [
      new Vector3(-1.2, -0.6, 1.6),
      new Vector3(1.2, -0.6, 1.6),
      new Vector3(-1.2, -0.6, -1.6),
      new Vector3(1.2, -0.6, -1.6)
    ];
    this.wheels = wheelPositions.map(function(pos, i) {
      const w = MeshBuilder.CreateCylinder('wheel_' + i, { diameter: 0.85, height: 0.4, tessellation: 16 }, this.scene);
      w.rotation.z = Math.PI / 2;
      w.parent = body;
      w.position = pos;
      const wm = new StandardMaterial('wm_' + i, this.scene);
      wm.diffuseColor = new Color3(0.08, 0.08, 0.08);
      w.material = wm;
      return w;
    }.bind(this));

    const bodyMat = new StandardMaterial('vanBody', this.scene);
    bodyMat.diffuseColor = new Color3(0.95, 0.20, 0.10);
    bodyMat.specularColor = new Color3(0.3, 0.3, 0.3);
    body.material = bodyMat;

    const rackMat = new StandardMaterial('rackMat', this.scene);
    rackMat.diffuseColor = new Color3(0.25, 0.25, 0.25);
    rack.material = rackMat;
    return body;
  }

  _setupKeyboard() {
    const keys = {};
    window.addEventListener('keydown', function(e) { keys[e.key] = true; });
    window.addEventListener('keyup', function(e) { keys[e.key] = false; });
    const self = this;
    this.scene.onBeforeRenderObservable.add(function() {
      self.input.forward = (keys['ArrowUp'] || keys['w'] || keys['W']) ? 1 : 0;
      self.input.backward = (keys['ArrowDown'] || keys['s'] || keys['S']) ? 1 : 0;
      self.input.left = (keys['ArrowLeft'] || keys['a'] || keys['A']) ? 1 : 0;
      self.input.right = (keys['ArrowRight'] || keys['d'] || keys['D']) ? 1 : 0;
      self.input.honk = keys['h'] || keys['H'];
    });
  }

  _setupHorn() {
    this._hornPlaying = false;
    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      this._audioCtx = null;
    }
  }

  _honk() {
    if (!this._audioCtx || this._hornPlaying) return;
    this._hornPlaying = true;
    const osc = this._audioCtx.createOscillator();
    const gain = this._audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this._audioCtx.destination);
    osc.frequency.setValueAtTime(320, this._audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, this._audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(this._audioCtx.currentTime + 0.5);
    const self = this;
    setTimeout(function() { self._hornPlaying = false; }, 600);
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    const ti = window.touchInput || { x: 0, y: 0, honk: false };
    const fwd = this.input.forward || (ti.y < -0.2 ? -ti.y : 0);
    const bwd = this.input.backward || (ti.y > 0.2 ? ti.y : 0);
    const lft = this.input.left || (ti.x < -0.2 ? -ti.x : 0);
    const rgt = this.input.right || (ti.x > 0.2 ? ti.x : 0);

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

    const forward = new Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
    this.mesh.rotation.y += this.steerAngle * Math.sign(this.speed);
    this.mesh.position.addInPlace(forward.scale(this.speed * dt));

    if (this.terrain) {
      const y = this.terrain.getHeightAtCoordinates(this.mesh.position.x, this.mesh.position.z) || 0;
      this.mesh.position.y = y + 1.2;
    }

    const wheelSpin = (this.speed / 20) * dt;
    if (this.wheels) {
      this.wheels.forEach(function(w) { w.rotation.x += wheelSpin; });
    }

    if (this.input.honk || ti.honk) this._honk();
  }

  getPosition() {
    return this.mesh.position.clone();
  }

  setColor(r, g, b) {
    if (this.mesh && this.mesh.material) {
      this.mesh.material.diffuseColor = new Color3(r, g, b);
    }
  }
}