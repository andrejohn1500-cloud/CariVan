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
    this._speechReady = false;

    // Unlock speech on first user touch
    const unlock = () => {
      const utt = new SpeechSynthesisUtterance('');
      utt.volume = 0;
      window.speechSynthesis.speak(utt);
      this._speechReady = true;
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('pointerdown', unlock);
      console.log('[CariVan] Speech unlocked');
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('pointerdown', unlock, { once: true });

    this._load();
  }

  _load() {
    SceneLoader.ImportMesh(
      '', './assets/', 'Running-Jody.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        this.root = meshes[0];
        this.root.scaling = new Vector3(15, 15, 15);
        const t = this.roadSystem.getCarTransform(this.roadDist, JODY_LATERAL);
        this.root.position   = t.position.clone();
        this.root.rotation.y = t.heading + Math.PI;
        console.log('[CariVan] Jody loaded');

        // Log and play all animation groups
        const anims = this.scene.animationGroups;
        console.log('[CariVan] Anim count:', anims.length);
        anims.forEach((ag, i) => console.log('[CariVan] Anim', i, ':', ag.name));
        if (anims.length > 0) {
          anims.forEach(ag => ag.stop());
          anims[0].start(true);
          console.log('[CariVan] Playing:', anims[0].name);
        }
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
    this.root.rotation.y = t.heading + Math.PI;

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

    // Speak
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt  = new SpeechSynthesisUtterance(msg);
      utt.lang   = 'en-GB';
      utt.pitch  = 1.4;
      utt.rate   = 1.1;
      utt.volume = 1.0;

      // Wait for voices to load
      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const female = voices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('woman') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('samantha')
        );
        if (female) utt.voice = female;
        window.speechSynthesis.speak(utt);
        console.log('[CariVan] Speaking:', msg);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        trySpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = trySpeak;
      }
    }

    console.log('[CariVan] Jody shouts:', msg);
  }
}