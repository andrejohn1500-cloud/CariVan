import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader, TransformNode } from '@babylonjs/core';

export class TestCar {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this._load();
  }

  _load() {
    const spawnDist = this.roadSystem.findNearestDist(4600, -9200);
    const t = this.roadSystem.getCarTransform(spawnDist, -30);

    SceneLoader.ImportMesh(
      '', './assets/', '2009_honda_civic_type_r_fd2_custom.glb', this.scene,
      (meshes) => {
        if (!meshes.length) return;

        const holder = new TransformNode('fd2Holder', this.scene);
        meshes.forEach(m => {
          if (!m.parent) m.parent = holder;
        });

        // Counter the GLB's internal offset by centering child meshes
        meshes.forEach(m => {
          if (m.parent === holder) {
            m.position.x = 0;
            m.position.z = 0;
          }
        });

        holder.scaling    = new Vector3(10, 10, 10);
        holder.position   = t.position.clone();
        holder.rotation.y = t.heading + Math.PI;

        console.log('[CariVan] FD2 holder at:', holder.position);
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}