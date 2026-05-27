import '@babylonjs/loaders/glTF';
import {
  Vector3, SceneLoader, TransformNode,
  MeshBuilder, StandardMaterial, Color3
} from '@babylonjs/core';

// rx/ry/rz in radians — adjust per vehicle after seeing in game
// scale — adjust if car appears giant or tiny
// Boeing and modern player cars removed from traffic
const TRAFFIC_CARS = [
  { file: 'suzuki_swift.glb',
    scale: 1.0,   rx: Math.PI, ry: 0,        rz: 0 },

  { file: '2005_toyota_corolla_luxel.glb',
    scale: 1.0,   rx: Math.PI, ry: 0,        rz: 0 },

  { file: 'nissan_caravan_detailed_3d_van_model_.glb',
    scale: 0.012, rx: Math.PI, ry: 0,        rz: 0 },

  { file: 'truck_toyota_corsa_b.glb',
    scale: 0.9,   rx: 0,       ry: Math.PI,  rz: 0 },

  { file: '2020_honda_fit_hybrid_6aa-gr3.glb',
    scale: 1.0,   rx: Math.PI, ry: 0,        rz: 0 },

  { file: '2009_honda_civic_type_r_fd2_custom.glb',
    scale: 1.0,   rx: Math.PI, ry: 0,        rz: 0 },

  { file: 'mitsubishi_lancer_evolution_6___www.vecarz.com.glb',
    scale: 1.0,   rx: Math.PI, ry: 0,        rz: 0 },
];

const TRAFFIC_COUNT = 7;
const TRAFFIC_LANE  = 60;
const CRASH_DIST    = 80;

export class TrafficSystem {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this.cars       = [];
    this._crashed   = new Set();
    this._spawn();
  }

  _spawn() {
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const cfg       = TRAFFIC_CARS[i % TRAFFIC_CARS.length];
      const startDist = (i / TRAFFIC_COUNT) * this.roadSystem.totalLength;

      const car = {
        dist:    startDist,
        speed:   45 + Math.random() * 30,
        lateral: TRAFFIC_LANE + (Math.random() - 0.5) * 14,
        root:    new TransformNode('trafficCar_' + i, this.scene),
        cfg:     cfg,
        alive:   true,
        id:      i,
      };

      SceneLoader.ImportMeshAsync('', './assets/', cfg.file, this.scene)
        .then(result => {
          result.meshes.forEach(m => { m.parent = car.root; });
          car.root.rotation.x = cfg.rx;
          car.root.rotation.y = cfg.ry;
          car.root.rotation.z = cfg.rz;
          car.root.scaling    = new Vector3(cfg.scale, cfg.scale, cfg.scale);
        })
        .catch(() => {
          const isVan   = cfg.file.includes('caravan');
          const isTruck = cfg.file.includes('truck');
          const w = isTruck ? 2.4 : isVan ? 2.0 : 1.8;
          const h = isTruck ? 2.8 : isVan ? 2.4 : 1.4;
          const d = isTruck ? 6.0 : isVan ? 5.2 : 4.2;
          const box = MeshBuilder.CreateBox('tBox_' + i, {
            width: w, height: h, depth: d
          }, this.scene);
          const mat  = new StandardMaterial('tMat_' + i, this.scene);
          const cols = [
            new Color3(0.8, 0.1, 0.1),
            new Color3(0.1, 0.2, 0.8),
            new Color3(0.1, 0.55, 0.1),
            new Color3(0.85, 0.70, 0.1),
            new Color3(0.55, 0.1, 0.55),
            new Color3(0.1, 0.55, 0.55),
            new Color3(0.9, 0.45, 0.1),
          ];
          mat.diffuseColor = cols[i % cols.length];
          box.material     = mat;
          box.parent       = car.root;
        });

      this.cars.push(car);
    }
  }

  update(deltaMs, playerDist, playerLateral) {
    const dt = Math.min(deltaMs / 1000, 0.05);

    this.cars.forEach(car => {
      if (!car.alive) return;

      // Move oncoming — reverse direction
      car.dist -= (car.speed / 3.6) * 10 * dt;

      // Wrap loop
      if (car.dist < 0)
        car.dist += this.roadSystem.totalLength;
      if (car.dist >= this.roadSystem.totalLength)
        car.dist -= this.roadSystem.totalLength;

      // Position on spline
      const { position, heading } =
        this.roadSystem.getCarTransform(car.dist, car.lateral);
      car.root.position.copyFrom(position);

      // Face oncoming direction — base heading flipped
      // Truck has ry:PI baked in so don't double-flip it
      if (car.cfg.file.includes('truck')) {
        car.root.rotation.y = heading;
      } else {
        car.root.rotation.y = heading + Math.PI;
      }

      // ── Crash detection ───────────────────────────────────────────────
      if (playerDist !== undefined && playerLateral !== undefined) {
        const distGap    = Math.abs(car.dist - playerDist);
        const lateralGap = Math.abs(car.lateral - playerLateral);
        if (distGap < CRASH_DIST && lateralGap < 60 &&
            !this._crashed.has(car.id)) {
          this._crashed.add(car.id);
          this._triggerCrash(car);
        }
      }
    });
  }

  _triggerCrash(car) {
    car.alive = false;
    const pos = car.root.position.clone();
    car.root.setEnabled(false);

    // ── Fireball ──────────────────────────────────────────────────────────
    const fireball = MeshBuilder.CreateSphere('crash_fire_' + car.id, {
      diameter: 40, segments: 6
    }, this.scene);
    fireball.position   = pos.clone();
    fireball.position.y += 15;
    const fireMat = new StandardMaterial('fireballMat_' + car.id, this.scene);
    fireMat.diffuseColor  = new Color3(1.0, 0.3, 0.0);
    fireMat.emissiveColor = new Color3(1.0, 0.4, 0.0);
    fireball.material = fireMat;

    // ── Black smoke ───────────────────────────────────────────────────────
    const smoke = MeshBuilder.CreateSphere('crash_smoke_' + car.id, {
      diameter: 55, segments: 6
    }, this.scene);
    smoke.position   = pos.clone();
    smoke.position.y += 40;
    const smokeMat = new StandardMaterial('smokeMat_' + car.id, this.scene);
    smokeMat.diffuseColor  = new Color3(0.1, 0.1, 0.1);
    smokeMat.emissiveColor = new Color3(0.08, 0.08, 0.08);
    smokeMat.alpha = 0.85;
    smoke.material = smokeMat;

    // ── Debris ────────────────────────────────────────────────────────────
    for (let d = 0; d < 6; d++) {
      const debris = MeshBuilder.CreateBox('debris_' + d + '_' + car.id, {
        width:  4 + Math.random() * 8,
        height: 4 + Math.random() * 8,
        depth:  4 + Math.random() * 8,
      }, this.scene);
      debris.position = new Vector3(
        pos.x + (Math.random() - 0.5) * 60,
        pos.y + Math.random() * 20,
        pos.z + (Math.random() - 0.5) * 60,
      );
      debris.rotation = new Vector3(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );
      const dm = new StandardMaterial('dMat_' + d + '_' + car.id, this.scene);
      dm.diffuseColor = new Color3(0.2, 0.2, 0.2);
      debris.material = dm;
      setTimeout(() => { try { debris.dispose(); } catch(e) {} }, 4000);
    }

    // ── Max wanted level ──────────────────────────────────────────────────
    if (window.SM) window.SM.setWanted(3);

    // ── Crash sound ───────────────────────────────────────────────────────
    this._crashSound();

    // ── Clean up + respawn ─────────────────────────────────────────────────
    setTimeout(() => { try { fireball.dispose(); } catch(e) {} }, 3000);
    setTimeout(() => {
      try { smoke.dispose(); } catch(e) {}
      car.dist += this.roadSystem.totalLength * 0.3;
      if (car.dist >= this.roadSystem.totalLength)
        car.dist -= this.roadSystem.totalLength;
      car.alive = true;
      this._crashed.delete(car.id);
      car.root.setEnabled(true);
    }, 5000);
  }

  _crashSound() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      gain.gain.value = 0.7;
      gain.connect(ctx.destination);

      // Low boom
      const boom = ctx.createOscillator();
      boom.type = 'sawtooth';
      boom.frequency.setValueAtTime(120, ctx.currentTime);
      boom.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
      boom.connect(gain);
      gain.gain.setValueAtTime(0.7, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      boom.start(ctx.currentTime);
      boom.stop(ctx.currentTime + 0.6);

      // Metal crunch
      const bufSize = ctx.sampleRate * 0.3;
      const buf     = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++)
        data[i] = (Math.random() * 2 - 1) *
                  Math.exp(-i / (bufSize * 0.3));
      const crunch = ctx.createBufferSource();
      crunch.buffer = buf;
      const cGain = ctx.createGain();
      cGain.gain.value = 0.5;
      crunch.connect(cGain);
      cGain.connect(ctx.destination);
      crunch.start(ctx.currentTime);

      setTimeout(() => { try { ctx.close(); } catch(e) {} }, 1000);
    } catch(e) {}
  }

  getNearestOncoming(playerDist, playerLateral) {
    let nearest = Infinity;
    this.cars.forEach(car => {
      if (!car.alive) return;
      const lateralGap = Math.abs(car.lateral - playerLateral);
      if (lateralGap < 100) {
        const gap = Math.abs(car.dist - playerDist);
        nearest   = Math.min(nearest, gap);
      }
    });
    return nearest;
  }
}