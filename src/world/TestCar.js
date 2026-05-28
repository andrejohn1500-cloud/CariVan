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

        // Zero out any baked-in transform first
        root.position = Vector3.Zero();
        root.rotationQuaternion = null;
        root.rotation = Vector3.Zero();

        root.scaling    = new Vector3(10, 10, 10);
        root.position.x = t.position.x;
        root.position.y = t.position.y;
        root.position.z = t.position.z;
        root.rotation.y = t.heading;

        console.log('[CariVan] FD2 at:', root.position.x, root.position.y, root.position.z);
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}