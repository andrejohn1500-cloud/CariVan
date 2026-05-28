import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';

const JODY_LATERAL     = -115;
const JODY_SPEED_FRAC  = 0.35;
const PLAYER_MAX_SPEED = 120;
const SHOUT_DISTANCE   = 80;
const SHOUT_COOLDOWN   = 5000;

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
        this.root.scaling = new Vector3(75, 75, 75);
        const t = this.roadSystem.getCarTransform(this.roadDist, JODY_LATERAL);
        this.root.position   = t.position.clone();
        this.root.rotation.y = t.heading;
        console.log('[CariVan] Jody loaded');
      },
      null,
      (s, msg) => console.warn('[CariVan] Jody failed:', msg)
    );
  }

  update(deltaMs, playerDist, playerLateral, playerSpeed) {
    if (!this.root) return;

    const jodySpeed = (PLAYER_MAX_SPEED * JODY_SPEED_FRAC) / 3.6;
    this.roadDist  += jodySpeed * (deltaMs / 1000);
    this.roadDist   = this.roadDist % this.roadSystem.totalLength;

    const t = this.roadSystem.getCarTransform(this.roadDist, JODY_LATERAL);
    this.root.position   = t.position.clone();
    this.root.rotation.y = t.heading;

    const now       = performance.now();
    const distAlong = Math.abs(playerDist - this.roadDist);
    const distLat   = Math.abs(playerLateral - JODY_LATERAL);

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

    // Show toast
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = '🏃‍♀️ ' + msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Speak with Web Speech API
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt  = new SpeechSynthesisUtterance(msg);
      utt.lang   = 'en-GB';
      utt.pitch  = 1.4;
      utt.rate   = 1.1;
      utt.volume = 1.0;

      // Pick a female voice if available
      const voices = window.speechSynthesis.getVoices();
      const female = voices.find(v =>
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('woman') ||
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('samantha')
      );
      if (female) utt.voice = female;

      window.speechSynthesis.speak(utt);
    }

    console.log('[CariVan] Jody shouts:', msg);
  }
}