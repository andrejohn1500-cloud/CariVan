import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';

const JOGGER_LATERAL   = -115;
const JOGGER_SPEED_FRAC = 0.35;
const PLAYER_MAX_SPEED = 120;
const SHOUT_DISTANCE   = 80;
const SHOUT_COOLDOWN   = 5000;

export class RoadJogger {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this.root       = null;
    this.roadDist   = roadSystem.totalLength * 0.25;
    this._lastShout = 0;
    this._anims     = [];
    this._load();
  }

  _load() {
    const animsBefore = this.scene.animationGroups.length;

    SceneLoader.ImportMesh(
      '', './assets/', 'male_jogging_30_frames_loop.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        this.root = meshes[0];
        this.root.scaling = new Vector3(20, 20, 20);
        const t = this.roadSystem.getCarTransform(this.roadDist, JOGGER_LATERAL);
        this.root.position   = t.position.clone();
        this.root.rotation.y = t.heading;

        this._anims = this.scene.animationGroups.slice(animsBefore);
        console.log('[CariVan] Jogger anim count:', this._anims.length);
        this._anims.forEach((ag, i) =>
          console.log('[CariVan] Jogger anim', i, ':', ag.name)
        );

        if (this._anims.length > 0) {
          this._anims.forEach(ag => ag.stop());
          this._anims[0].start(true);
          console.log('[CariVan] Playing:', this._anims[0].name);
        }

        console.log('[CariVan] Jogger loaded');
      },
      null,
      (s, msg) => console.warn('[CariVan] Jogger failed:', msg)
    );
  }

  update(deltaMs, playerDist, playerLateral, playerSpeed) {
    if (!this.root) return;

    const speed = (PLAYER_MAX_SPEED * JOGGER_SPEED_FRAC) / 3.6;
    this.roadDist += speed * (deltaMs / 1000);
    this.roadDist  = this.roadDist % this.roadSystem.totalLength;

    const t = this.roadSystem.getCarTransform(this.roadDist, JOGGER_LATERAL);
    this.root.position   = t.position.clone();
    this.root.rotation.y = t.heading + Math.PI;

    const now       = performance.now();
    const distAlong = Math.abs(playerDist - this.roadDist);
    const distLat   = Math.abs(playerLateral - JOGGER_LATERAL);

    if (distAlong < SHOUT_DISTANCE &&
        distLat   < SHOUT_DISTANCE &&
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

    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = '🏃 ' + msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    console.log('[CariVan] Jogger shouts:', msg);
  }
}