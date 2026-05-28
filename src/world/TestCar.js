import '@babylonjs/loaders/glTF';
import { Vector3, SceneLoader, TransformNode } from '@babylonjs/core';

// FD2 tuning — adjust these two until it sits on the road
const OFFSET_X = 35;   // + moves right, - moves left
const OFFSET_Z = 15;   // + moves forward, - moves back

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

        holder.scaling    = new Vector3(10, 10, 10);
        holder.position   = new Vector3(
          t.position.x + OFFSET_X,
          t.position.y,
          t.position.z + OFFSET_Z
        );
        holder.rotation.y = t.heading + Math.PI;

        console.log('[CariVan] FD2 placed');
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}