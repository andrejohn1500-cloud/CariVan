import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';

export class TestCar {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this._load();
  }

  _load() {
    SceneLoader.ImportMesh(
      '', './assets/', '2009_honda_civic_type_r_fd2_custom.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        const root = meshes[0];
        root.scaling    = new Vector3(10, 10, 10);
        root.position   = new Vector3(4650, 25.5, -9350);
        root.rotation.y = 0;
        console.log('[CariVan] FD2 loaded at hardcoded position');
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}