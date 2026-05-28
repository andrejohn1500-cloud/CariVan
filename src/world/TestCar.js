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

        holder.scaling    = new Vector3(10, 10, 10);
        holder.position   = t.position.clone();
        holder.rotation.y = t.heading + Math.PI;

        // Force everything to update before measuring
        holder.computeWorldMatrix(true);
        meshes.forEach(m => {
          if (m.computeWorldMatrix) m.computeWorldMatrix(true);
          if (m.refreshBoundingInfo) m.refreshBoundingInfo();
        });

        // Measure the actual visible center of the car
        let min = new Vector3(Infinity, Infinity, Infinity);
        let max = new Vector3(-Infinity, -Infinity, -Infinity);
        meshes.forEach(m => {
          if (!m.getBoundingInfo) return;
          const bb = m.getBoundingInfo().boundingBox;
          min = Vector3.Minimize(min, bb.minimumWorld);
          max = Vector3.Maximize(max, bb.maximumWorld);
        });
        const center = min.add(max).scale(0.5);

        // First correction pass
        let correction = t.position.subtract(center);
        correction.y = 0;
        holder.position.addInPlace(correction);

        // Second pass — re-measure and correct any remaining drift
        holder.computeWorldMatrix(true);
        meshes.forEach(m => {
          if (m.computeWorldMatrix) m.computeWorldMatrix(true);
          if (m.refreshBoundingInfo) m.refreshBoundingInfo();
        });
        let min2 = new Vector3(Infinity, Infinity, Infinity);
        let max2 = new Vector3(-Infinity, -Infinity, -Infinity);
        meshes.forEach(m => {
          if (!m.getBoundingInfo) return;
          const bb = m.getBoundingInfo().boundingBox;
          min2 = Vector3.Minimize(min2, bb.minimumWorld);
          max2 = Vector3.Maximize(max2, bb.maximumWorld);
        });
        const center2 = min2.add(max2).scale(0.5);
        const correction2 = t.position.subtract(center2);
        correction2.y = 0;
        holder.position.addInPlace(correction2);

        console.log('[CariVan] FD2 visible center was at:', center);
        console.log('[CariVan] Corrected by:', correction);
        console.log('[CariVan] Final holder:', holder.position);
      },
      null,
      (s, msg) => console.warn('[CariVan] FD2 failed:', msg)
    );
  }
}