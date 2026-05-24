 /**
 * TerrainMesh.js  (REPLACED)
 *
 * KEY FIX: attaches getHeightAtCoordinates(x, z) to the ground mesh
 * so every other system (VanController, RoadRenderer, ArgyleAirport)
 * can query terrain height correctly.
 *
 * Heightmap strategy (in priority order):
 *   1. SRTM PNG heightmap loaded from /assets/heightmap_svg.png
 *      (a real-world greyscale elevation image for St. Vincent)
 *   2. If that fails → mathematical fallback that roughly approximates
 *      SVG's shape (better than the original single-blob version)
 *
 * To use real elevation:
 *   Download SRTM30 data for SVG from: https://earthexplorer.usgs.gov
 *   Export as greyscale PNG, save to /public/assets/heightmap_svg.png
 *   The loader below handles the rest automatically.
 */

import {
  MeshBuilder, StandardMaterial, Color3,
  DynamicTexture, VertexBuffer
} from '@babylonjs/core';

const MAX_HEIGHT = 1234;   // La Soufrière summit in metres
const SUBS       = 200;    // Mesh subdivisions — higher = better road conformity
const MAP_W      = 29000;  // World units (matches SVG_BOUNDS.worldWidth)
const MAP_H      = 45000;  // World units (matches SVG_BOUNDS.worldHeight)

// Internal heightmap store — shared so getHeightAtCoordinates can read it
let _hmBuffer = null;
let _hmWidth  = 0;
let _hmHeight = 0;

// ── Public API ─────────────────────────────────────────────────────────
export async function buildTerrain(scene, onProgress) {
  if (onProgress) onProgress('Loading elevation data…');

  const hmData = await _loadHeightmap(onProgress);
  _hmBuffer = hmData.buffer;
  _hmWidth  = hmData.width;
  _hmHeight = hmData.height;

  if (onProgress) onProgress('Building terrain mesh…');
  const ground = _buildGroundMesh(hmData, scene);

  // ── CRITICAL FIX: attach height-query function ──────────────────────
  ground.getHeightAtCoordinates = function(worldX, worldZ) {
    return _queryHeight(worldX, worldZ);
  };

  applyTerrainMaterial(ground, scene);
  return ground;
}

// ── Height query (used by terrain.getHeightAtCoordinates) ─────────────
function _queryHeight(worldX, worldZ) {
  if (!_hmBuffer) return 0;

  // Map world coords → 0..1 normalised
  const nx = (worldX + MAP_W / 2) / MAP_W;
  const nz = (worldZ + MAP_H / 2) / MAP_H;

  // Clamp to valid range
  const col = Math.max(0, Math.min(_hmWidth  - 1, Math.floor(nx * (_hmWidth  - 1))));
  const row = Math.max(0, Math.min(_hmHeight - 1, Math.floor(nz * (_hmHeight - 1))));

  // Bilinear interpolation for smoother results
  const col1 = Math.min(col + 1, _hmWidth  - 1);
  const row1 = Math.min(row + 1, _hmHeight - 1);
  const tx   = (nx * (_hmWidth  - 1)) - col;
  const tz   = (nz * (_hmHeight - 1)) - row;

  const h00 = _hmBuffer[row  * _hmWidth + col ] * MAX_HEIGHT;
  const h10 = _hmBuffer[row  * _hmWidth + col1] * MAX_HEIGHT;
  const h01 = _hmBuffer[row1 * _hmWidth + col ] * MAX_HEIGHT;
  const h11 = _hmBuffer[row1 * _hmWidth + col1] * MAX_HEIGHT;

  return h00 * (1-tx)*(1-tz) + h10 * tx*(1-tz) + h01 * (1-tx)*tz + h11 * tx*tz;
}

// ── Heightmap loader ──────────────────────────────────────────────────
async function _loadHeightmap(onProgress) {
  try {
    return await _loadFromImage('/assets/heightmap_svg.png', onProgress);
  } catch (e) {
    console.warn('TerrainMesh: heightmap image not found, using mathematical fallback:', e.message);
    if (onProgress) onProgress('Generating terrain from mathematical model…');
    return _generateMathHeightmap();
  }
}

// ── Load real SRTM heightmap PNG ──────────────────────────────────────
function _loadFromImage(url, onProgress) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (onProgress) onProgress('Decoding elevation data…');
      const SIZE = 512;
      const canvas = document.createElement('canvas');
      canvas.width  = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
      const px  = imageData.data;
      const buf = new Float32Array(SIZE * SIZE);
      for (let i = 0; i < SIZE * SIZE; i++) {
        // R channel = elevation (0-255 → 0-1)
        buf[i] = px[i * 4] / 255;
      }
      resolve({ buffer: buf, width: SIZE, height: SIZE });
    };
    img.onerror = () => reject(new Error('Failed to load ' + url));
    img.src = url;
  });
}

// ── Mathematical fallback heightmap (improved SVG approximation) ───────
function _generateMathHeightmap() {
  const SIZE = 256;
  const buf  = new Float32Array(SIZE * SIZE);

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const n = row / (SIZE - 1);   // 0=south, 1=north
      const e = col / (SIZE - 1);   // 0=west, 1=east

      let h = 0;

      // La Soufrière volcano — north-central, peaks at 1234m
      const dV = Math.sqrt(Math.pow(n - 0.82, 2) + Math.pow(e - 0.48, 2));
      h += Math.max(0, 1.0 - dV * 4.2) * 1.0;

      // Central ridge running N-S (spine of the island)
      const ridgeDist = Math.abs(e - 0.50);
      h += Math.max(0, 0.5 - ridgeDist * 2.8) * (0.2 + n * 0.5);

      // Secondary ridge (windward side)
      const ridge2 = Math.abs(e - 0.62);
      h += Math.max(0, 0.25 - ridge2 * 3.0) * (0.1 + n * 0.3);

      // Mesopotamia valley — fertile interior bowl (lower)
      const dMes = Math.sqrt(Math.pow(n - 0.40, 2) + Math.pow(e - 0.52, 2));
      h *= 1 - Math.max(0, 0.15 - dMes * 2.0);

      // Kingstown coastal flat (south-west, near sea level)
      const dKtown = Math.sqrt(Math.pow(n - 0.18, 2) + Math.pow(e - 0.30, 2));
      h *= 1 - Math.max(0, 0.18 - dKtown * 3.5);

      // Argyle coastal flat (south-east, airport)
      const dArgyle = Math.sqrt(Math.pow(n - 0.17, 2) + Math.pow(e - 0.72, 2));
      h *= 1 - Math.max(0, 0.12 - dArgyle * 4.0);

      // Island edge fade (ocean)
      const edge = Math.min(n, 1 - n, e, 1 - e);
      h *= Math.min(1, edge * 8);

      // Gentle noise
      h += (Math.sin(col * 0.12 + row * 0.18) * 0.5 + 0.5) * 0.04;
      h += (Math.cos(col * 0.08 - row * 0.11) * 0.5 + 0.5) * 0.03;

      buf[row * SIZE + col] = Math.max(0, Math.min(1, h));
    }
  }

  return { buffer: buf, width: SIZE, height: SIZE };
}

// ── Build BabylonJS ground mesh ───────────────────────────────────────
function _buildGroundMesh(hmData, scene) {
  const ground = MeshBuilder.CreateGround('svg_terrain', {
    width:        MAP_W,
    height:       MAP_H,
    subdivisions: SUBS,
    updatable:    true
  }, scene);

  try {
    const positions  = ground.getVerticesData(VertexBuffer.PositionKind);
    const vertsPerRow = SUBS + 1;

    for (let i = 0; i < vertsPerRow; i++) {
      for (let j = 0; j < vertsPerRow; j++) {
        const bufRow = Math.floor((i / SUBS) * (hmData.height - 1));
        const bufCol = Math.floor((j / SUBS) * (hmData.width  - 1));
        const h      = hmData.buffer[bufRow * hmData.width + bufCol] * MAX_HEIGHT;
        positions[(i * vertsPerRow + j) * 3 + 1] = h;
      }
    }

    ground.setVerticesData(VertexBuffer.PositionKind, positions);
    ground.updateFacetData();   // for future raycasting if needed
    ground.refreshBoundingInfo();
  } catch (e) {
    console.warn('TerrainMesh: height application failed, using flat ground:', e);
  }

  ground.receiveShadows = true;
  return ground;
}

// ── Terrain material (elevation-based colour) ─────────────────────────
function applyTerrainMaterial(ground, scene) {
  const mat = new StandardMaterial('terrainMat', scene);

  const SIZE = 512;
  const tex  = new DynamicTexture('terrainColour', SIZE, scene, false);
  const ctx  = tex.getContext();

  // Vertical gradient: sea-level brown → lowland green → forest → rock → summit
  const g = ctx.createLinearGradient(0, SIZE, 0, 0);
  g.addColorStop(0.00, '#c2a96e');   // sand/coastal
  g.addColorStop(0.04, '#7ab648');   // low grass
  g.addColorStop(0.25, '#3a8c2a');   // tropical forest
  g.addColorStop(0.55, '#2a6e1e');   // dense rainforest
  g.addColorStop(0.75, '#6b5a48');   // rocky slopes
  g.addColorStop(0.90, '#8a7a6e');   // volcanic rock
  g.addColorStop(1.00, '#c0b8b0');   // near summit

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  tex.update();
  mat.diffuseTexture  = tex;
  mat.specularColor   = new Color3(0.04, 0.04, 0.04);
  ground.material     = mat;
}
