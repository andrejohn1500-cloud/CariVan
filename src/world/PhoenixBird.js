import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';

const FLY_AHEAD    = 8000;  // far enough ahead to see full sweep
const FLY_HEIGHT   = 80;    // eye level, not overhead
const FLY_WIDTH    = 400;   // sweep width right to left
const FLY_DURATION = 6000;  // ms to complete crossing
const TRIGGER_FRAC = 0.10;  // fires at 1/10 of road loop

export class PhoenixBird {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this.root       = null;
    this._triggered = false;
    this._flying    = false;
    this._flyT      = 0;
    this._startPos  = null;
    this._endPos    = null;
    this._load();
  }

  _load() {
    SceneLoader.ImportMesh(
      '', './assets/', 'phoenix_bird.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        this.root = meshes[0];
        this.root.scaling = new Vector3(0.5, 0.5, 0.5);
        this.root.setEnabled(false);
        console.log('[CariVan] Phoenix loaded');
      },
      null,
      (s, msg) => console.warn('[CariVan] Phoenix failed:', msg)
    );
  }

  update(deltaMs, playerDist) {
    if (!this.root) return;

    const total         = this.roadSystem.totalLength;
    const triggerDist   = total * TRIGGER_FRAC;
    const triggerWindow = 1200;

    // Trigger when player is within window of 1/4 mark
    if (!this._triggered &&
        playerDist > triggerDist - 200 &&
        playerDist < triggerDist + triggerWindow) {
      this._startFlyby(playerDist);
      this._triggered = true;
    }

    // Reset for next loop
    if (this._triggered && playerDist < triggerDist - 800) {
      this._triggered = false;
    }

    // Animate sweep
    if (this._flying) {
      this._flyT += deltaMs;
      const t = Math.min(this._flyT / FLY_DURATION, 1);
      this.root.position = Vector3.Lerp(this._startPos, this._endPos, t);

      if (t >= 1) {
        this._flying = false;
        this.root.setEnabled(false);
      }
    }
  }

  _startFlyby(playerDist) {
    if (!this.root) return;

    const ahead = this.roadSystem.getAtDist(playerDist + FLY_AHEAD);
    const pos   = ahead.pos;
    const y     = pos.y + FLY_HEIGHT;

    // Sweep along world X axis — always centred on road regardless of curve
    this._startPos = new Vector3(pos.x + FLY_WIDTH / 2, y, pos.z);
    this._endPos   = new Vector3(pos.x - FLY_WIDTH / 2, y, pos.z);

    this.root.rotation.y = ahead.heading + Math.PI / 2;
    this.root.position   = this._startPos.clone();
    this.root.setEnabled(true);
    this._flying = true;
    this._flyT   = 0;
    console.log('[CariVan] Phoenix flyby triggered!');
  }
}