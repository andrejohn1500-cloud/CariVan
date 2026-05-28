import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';

export class TestCar {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this._load();
  }

  _load() {
    const t = this.roadSystem.getCarTransform(
      this.roadSystem.totalLength * 0.001, -40
    );

    SceneLoader.ImportMesh(
      '', './assets/', '2009_honda_civic_type_r_fd2_custom.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        const root = meshes[0];
        root.scaling    = new Vector3(10, 10, 10);
        root.position   = t.position.clone();
        root.position.y = 25.5;
        root.rotation.y = t.heading + (Math.PI / 2);
        console.log('[CariVan] FD2 loaded');
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}