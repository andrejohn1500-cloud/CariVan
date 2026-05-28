import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader } from '@babylonjs/core';

export class TestCar {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this._load();
  }

  _load() {
    const spawnDist = this.roadSystem.findNearestDist(4600, -9200);
    const t = this.roadSystem.getCarTransform(spawnDist, 0);

    SceneLoader.ImportMesh(
      '', './assets/', '2009_honda_civic_type_r_fd2_custom.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;
        const root = meshes[0];
        root.scaling    = new Vector3(10, 10, 10);
        root.position   = t.position.clone();
        root.rotation.y = t.heading;
        console.log('[CariVan] FD2 on road at:', t.position);
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}