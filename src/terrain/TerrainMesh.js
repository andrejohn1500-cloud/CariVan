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

          // TERRAIN — scale to match road coords, preserve satellite texture
          if (name.includes('terrain')) {
            mesh.isPickable = true;
            mesh.checkCollisions = true;
            // GLTF terrain is ±9694 units, road goes to x:15200 z:12500
            // Scale 1.6x and recentre to cover full road area
            mesh.scaling = new Vector3(1.6, 1.0, 1.6);
            mesh.position.x = 7500;
            mesh.position.z = 800;
            // DO NOT override material — keeps TerrainNodeMaterial_baseColor.jpeg
            this.terrainMesh = mesh;
            console.log('[CariVan] TerrainNode ready:', mesh.name);
          }

          // STREETS — lift above terrain to prevent z-fighting
          if (name.includes('street')) {
            mesh.isPickable = false;
            mesh.scaling = new Vector3(1.6, 1.0, 1.6);
            mesh.position.x = 7500;
            mesh.position.y += 1.0;
            mesh.position.z = 800;
            if (mesh.material) {
              mesh.material.backFaceCulling = false;
            }
            console.log('[CariVan] Streets ready:', mesh.name);
          }

          // BUILDINGS
          if (name.includes('building') || name.includes('adornment')) {
            mesh.checkCollisions = true;
            mesh.scaling = new Vector3(1.6, 1.0, 1.6);
            mesh.position.x = 7500;
            mesh.position.z = 800;
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
      width: 40000, height: 40000, subdivisions: 4
    }, this.scene);
    const mat = new StandardMaterial('fallbackMat', this.scene);
    mat.diffuseColor = new Color3(0.18, 0.38, 0.12);
    ground.material = mat;
    ground.position.x = 7500;
    ground.position.y = 0;
    ground.position.z = 800;
    this.terrainMesh = ground;
    this.ready = true;
  }

  getHeightAt(x, z) {
    return 25.5;
  }
}

export function buildTerrain(scene) { return new TerrainMesh(scene); }