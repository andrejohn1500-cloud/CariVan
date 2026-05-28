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

        holder.scaling = new Vector3(10, 10, 10);

        // Compute world bounding center of all meshes to find offset
        let min = new Vector3(Infinity, Infinity, Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);
        meshes.forEach(m => {
          if (!m.getBoundingInfo) return;
          m.computeWorldMatrix(true);
          const bb = m.getBoundingInfo().boundingBox;
          min = Vector3.Minimize(min, bb.minimumWorld);
          max = Vector3.Maximize(max, bb.maximumWorld);
        });
        const center = min.add(max).scale(0.5);

        // Shift children so geometry center sits at holder origin
        meshes.forEach(m => {
          if (m.parent === holder) {
            m.position.x -= center.x;
            m.position.z -= center.z;
          }
        });

        holder.position   = t.position.clone();
        holder.rotation.y = t.heading + Math.PI;

        console.log('[CariVan] FD2 center offset:', center);
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}