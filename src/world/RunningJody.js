import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';
import { getRandomPhrase } from '../data/vincy_phrases.js';

const JODY_LATERAL    = -115;  // left side dirt strip
const JODY_SPEED_FRAC = 0.35;  // 35% of player max speed
const PLAYER_MAX_SPEED = 120;  // km/h
const SHOUT_DISTANCE  = 80;    // units — how close before she shouts
const SHOUT_COOLDOWN  = 5000;  // ms between shouts

export class RunningJody {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this.root       = null;
    this.roadDist   = roadSystem.totalLength * 0.25;
    this._lastShout = 0;
    this._load();
  }

  _load() {
    SceneLoader.ImportMesh(
      '', './assets/', 'Running-Jody.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        this.root = meshes[0];
        this.root.scaling = new Vector3(1, 1, 1);
        const t = this.roadSystem.getCarTransform(this.roadDist, JODY_LATERAL);
        this.root.position = t.position.clone();
        this.root.rotation.y = t.heading;
        console.log('[CariVan] Jody loaded');
      },
      null,
      (s, msg) => console.warn('[CariVan] Jody failed:', msg)
    );
  }

  update(deltaMs, playerDist, playerLateral, playerSpeed) {
    if (!this.root) return;

    // Move Jody forward along road
    const jodySpeed = (PLAYER_MAX_SPEED * JODY_SPEED_FRAC) / 3.6; // to units/s
    this.roadDist += jodySpeed * (deltaMs / 1000);
    this.roadDist  = this.roadDist % this.roadSystem.totalLength;

    // Position on left dirt strip
    const t = this.roadSystem.getCarTransform(this.roadDist, JODY_LATERAL);
    this.root.position = t.position.clone();
    this.root.rotation.y = t.heading;

    // Check if player is close enough to shout
    const now       = performance.now();
    const distAlong = Math.abs(playerDist - this.roadDist);
    const distLat   = Math.abs(playerLateral - JODY_LATERAL);

    if (distAlong < SHOUT_DISTANCE &&
        distLat < SHOUT_DISTANCE &&
        now - this._lastShout > SHOUT_COOLDOWN) {
      this._lastShout = now;
      this._shout();
    }
  }

  _shout() {
    const phrases = [
      'Aye! Watch weh yuh going nah!',
      'Yuh mad or wah?! Move!',
      'Eh eh! Yuh nearly lick me down!',
      'Stupidness! Watch de road!',
      'Aye aye! Yuh blind?!',
      'Move from me nah man!',
    ];
    const msg = phrases[Math.floor(Math.random() * phrases.length)];
    if (window.SM && window.SM.showToast) {
      window.SM.showToast('🏃‍♀️ ' + msg);
    } else {
      // Fallback toast
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = '🏃‍♀️ ' + msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
    }
    console.log('[CariVan] Jody shouts:', msg);
  }
}