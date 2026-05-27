import '@babylonjs/loaders/glTF';
import {
  Vector3, SceneLoader, TransformNode,
  MeshBuilder, StandardMaterial, Color3
} from '@babylonjs/core';

const TRAFFIC_CARS = [
  'nissan_caravan_detailed_3d_van_model_.glb',
  '2005_toyota_corolla_luxel.glb',
  'honda_civic_type_r_tc1__www.vecarz.com.glb',
  '2023_toyota_rav4_hybrid.glb',
  'mitsubishi_lancer_evolution_6___www.vecarz.com.glb',
  'suzuki_swift.glb',
];

const TRAFFIC_COUNT = 6;
const TRAFFIC_LANE  = 55;  // right lane lateral offset

export class TrafficSystem {
  constructor(scene, roadSystem) {
    this.scene      = scene;
    this.roadSystem = roadSystem;
    this.cars       = [];
    this._spawn();
  }

  _spawn() {
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const glbFile  = TRAFFIC_CARS[i % TRAFFIC_CARS.length];
      const startDist = (i / TRAFFIC_COUNT) * this.roadSystem.totalLength;

      const car = {
        dist:    startDist,
        speed:   50 + Math.random() * 30,
        lateral: TRAFFIC_LANE + (Math.random() - 0.5) * 12,
        root:    new TransformNode('trafficCar_' + i, this.scene),
        loaded:  false,
      };

      SceneLoader.ImportMeshAsync('', './assets/', glbFile, this.scene)
        .then(result => {
          result.meshes.forEach(m => { m.parent = car.root; });
          car.loaded = true;
        })
        .catch(() => {
          // Fallback coloured box
          const box = MeshBuilder.CreateBox('tBox_' + i, {
            width: 1.8, height: 1.4, depth: 4.2
          }, this.scene);
          const mat = new StandardMaterial('tMat_' + i, this.scene);
          const cols = [
            new Color3(0.8, 0.1, 0.1),
            new Color3(0.1, 0.2, 0.8),
            new Color3(0.1, 0.6, 0.1),
            new Color3(0.8, 0.7, 0.1),
            new Color3(0.6, 0.1, 0.6),
            new Color3(0.1, 0.6, 0.6),
          ];
          mat.diffuseColor = cols[i % cols.length];
          box.material     = mat;
          box.parent       = car.root;
          car.loaded       = true;
        });

      this.cars.push(car);
    }
  }

  update(deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);

    this.cars.forEach(car => {
      // Move in reverse direction — oncoming traffic
      car.dist -= (car.speed / 3.6) * 10 * dt;

      // Wrap around road loop
      if (car.dist < 0)
        car.dist += this.roadSystem.totalLength;
      if (car.dist >= this.roadSystem.totalLength)
        car.dist -= this.roadSystem.totalLength;

      // Get position from spline at right lane offset
      const { position, heading } =
        this.roadSystem.getCarTransform(car.dist, car.lateral);

      car.root.position.copyFrom(position);
      // Face opposite direction to player
      car.root.rotation.y = heading + Math.PI;
    });
  }

  // Returns gap to nearest oncoming car — for future collision detection
  getNearestOncoming(playerDist, playerLateral) {
    let nearest = Infinity;
    this.cars.forEach(car => {
      const lateralGap = Math.abs(car.lateral - playerLateral);
      if (lateralGap < 100) {
        const gap = Math.abs(car.dist - playerDist);
        nearest = Math.min(nearest, gap);
      }
    });
    return nearest;
  }
}