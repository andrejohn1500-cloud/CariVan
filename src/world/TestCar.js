import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';

export class TestCar {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this._load();
  }

  _load() {
    // Swift spawns at x=4600, z=-9200, y=25.5
    // Place FD2 ahead in right lane at same y
    SceneLoader.ImportMesh(
      '', './assets/', '2009_honda_civic_type_r_fd2_custom.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        const root = meshes[0];
        root.scaling    = new Vector3(10, 10, 10);
        root.position   = new Vector3(4630, 25.5, -9500);
        root.rotation.y = Math.PI;
        console.log('[CariVan] FD2 loaded');
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}