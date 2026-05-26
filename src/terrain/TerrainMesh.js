import '@babylonjs/loaders/glTF';
import {
  SceneLoader, Vector3, Color3,
  StandardMaterial, MeshBuilder
} from '@babylonjs/core';

export class TerrainMesh {
  constructor(scene) {
    this.scene = scene;
    this.ready = false;
    this.terrainMesh = null;
    this._loadGLTF();
  }

  _loadGLTF() {
    SceneLoader.ImportMesh(
      '',
      './assets/',
      'scene.gltf',
      this.scene,
      (meshes) => {
        console.log('[CariVan] GLTF loaded —', meshes.length, 'meshes');

        meshes.forEach(mesh => {
          const name = mesh.name.toLowerCase();

          // TERRAIN — preserve the real satellite photo texture
          if (name.includes('terrain')) {
            mesh.isPickable = true;
            mesh.checkCollisions = true;
            // DO NOT override material — keeps TerrainNodeMaterial_baseColor.jpeg
            this.terrainMesh = mesh;
            console.log('[CariVan] TerrainNode ready:', mesh.name);
          }

          // STREETS — lift above terrain to prevent z-fighting
          if (name.includes('street')) {
            mesh.isPickable = false;
            mesh.position.y += 1.0;
            if (mesh.material) {
              mesh.material.backFaceCulling = false;
            }
            console.log('[CariVan] Streets ready:', mesh.name);
          }

          // BUILDINGS
          if (name.includes('building') || name.includes('adornment')) {
            mesh.checkCollisions = true;
          }
        });

        this.ready = true;
      },
      (evt) => {
        if (evt.total) {
          console.log('[CariVan] Loading:', Math.round(evt.loaded / evt.total * 100) + '%');
        }
      },
      (scene, message, exception) => {
        console.error('[CariVan] GLTF failed:', message);
        this._buildFallbackGround();
      }
    );
  }

  _buildFallbackGround() {
    console.warn('[CariVan] Fallback flat terrain');
    const ground = MeshBuilder.CreateGround('ground', {
      width: 22000, height: 36000, subdivisions: 4
    }, this.scene);
    const mat = new StandardMaterial('fallbackMat', this.scene);
    mat.diffuseColor = new Color3(0.18, 0.38, 0.12);
    ground.material = mat;
    ground.position.y = 0;
    this.terrainMesh = ground;
    this.ready = true;
  }

  getHeightAt(x, z) {
    return 25.5;
  }
}