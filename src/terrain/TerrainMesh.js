import {
  MeshBuilder, StandardMaterial, Color3,
  DynamicTexture, VertexBuffer
} from '@babylonjs/core';

const MAX_HEIGHT = 1234;
const SUBS       = 200;
const MAP_W      = 29000;
const MAP_H      = 45000;

let _hmBuffer = null;
let _hmWidth  = 0;
let _hmHeight = 0;

export async function buildTerrain(scene, onProgress) {
  if (onProgress) onProgress('Loading elevation data…');
  const hmData = await _loadHeightmap(onProgress);
  _hmBuffer = hmData.buffer;
  _hmWidth  = hmData.width;
  _hmHeight = hmData.height;
  if (onProgress) onProgress('Building terrain mesh…');
  const ground = _buildGroundMesh(hmData, scene);
  ground.getHeightAtCoordinates = function(worldX, worldZ) {
    return _queryHeight(worldX, worldZ);
  };
  applyTerrainMaterial(ground, scene);
  return ground;
}

function _queryHeight(worldX, worldZ) {
  if (!_hmBuffer) return 0;
  const nx =  (worldX + MAP_W / 2) / MAP_W;
  // FLIP row: image row 0 = top = geographic NORTH
  // nz=0 means south, nz=1 means north → row should go high→low
  const nz = (worldZ + MAP_H / 2) / MAP_H;

  const colF = nx * (_hmWidth  - 1);
  const rowF = (1.0 - nz) * (_hmHeight - 1); // ← flipped

  const col  = Math.max(0, Math.min(_hmWidth  - 1, Math.floor(colF)));
  const row  = Math.max(0, Math.min(_hmHeight - 1, Math.floor(rowF)));
  const col1 = Math.min(col + 1, _hmWidth  - 1);
  const row1 = Math.min(row + 1, _hmHeight - 1);
  const tx   = colF - col;
  const tz   = rowF - row;

  const h00 = _hmBuffer[row  * _hmWidth + col ] * MAX_HEIGHT;
  const h10 = _hmBuffer[row  * _hmWidth + col1] * MAX_HEIGHT;
  const h01 = _hmBuffer[row1 * _hmWidth + col ] * MAX_HEIGHT;
  const h11 = _hmBuffer[row1 * _hmWidth + col1] * MAX_HEIGHT;

  return h00*(1-tx)*(1-tz) + h10*tx*(1-tz) + h01*(1-tx)*tz + h11*tx*tz;
}

async function _loadHeightmap(onProgress) {
  try {
    return await _loadFromImage('/assets/heightmap_svg.png', onProgress);
  } catch (e) {
    console.warn('Heightmap not found, using math fallback:', e.message);
    if (onProgress) onProgress('Generating terrain…');
    return _generateMathHeightmap();
  }
}

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
        buf[i] = px[i * 4] / 255;
      }
      resolve({ buffer: buf, width: SIZE, height: SIZE });
    };
    img.onerror = () => reject(new Error('Failed: ' + url));
    img.src = url;
  });
}

function _generateMathHeightmap() {
  const SIZE = 256;
  const buf  = new Float32Array(SIZE * SIZE);
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const n = row / (SIZE - 1);
      const e = col / (SIZE - 1);
      let h = 0;
      const dV = Math.sqrt(Math.pow(n - 0.82, 2) + Math.pow(e - 0.48, 2));
      h += Math.max(0, 1.0 - dV * 4.2) * 1.0;
      const ridgeDist = Math.abs(e - 0.50);
      h += Math.max(0, 0.5 - ridgeDist * 2.8) * (0.2 + n * 0.5);
      const ridge2 = Math.abs(e - 0.62);
      h += Math.max(0, 0.25 - ridge2 * 3.0) * (0.1 + n * 0.3);
      const dMes = Math.sqrt(Math.pow(n - 0.40, 2) + Math.pow(e - 0.52, 2));
      h *= 1 - Math.max(0, 0.15 - dMes * 2.0);
      const dKtown = Math.sqrt(Math.pow(n - 0.18, 2) + Math.pow(e - 0.30, 2));
      h *= 1 - Math.max(0, 0.18 - dKtown * 3.5);
      const dArgyle = Math.sqrt(Math.pow(n - 0.17, 2) + Math.pow(e - 0.72, 2));
      h *= 1 - Math.max(0, 0.12 - dArgyle * 4.0);
      const edge = Math.min(n, 1-n, e, 1-e);
      h *= Math.min(1, edge * 8);
      h += (Math.sin(col*0.12 + row*0.18)*0.5+0.5)*0.04;
      h += (Math.cos(col*0.08 - row*0.11)*0.5+0.5)*0.03;
      buf[row * SIZE + col] = Math.max(0, Math.min(1, h));
    }
  }
  return { buffer: buf, width: SIZE, height: SIZE };
}

function _buildGroundMesh(hmData, scene) {
  const ground = MeshBuilder.CreateGround('svg_terrain', {
    width:        MAP_W,
    height:       MAP_H,
    subdivisions: SUBS,
    updatable:    true
  }, scene);

  try {
    const positions   = ground.getVerticesData(VertexBuffer.PositionKind);
    const vertsPerRow = SUBS + 1;
    for (let i = 0; i < vertsPerRow; i++) {
      for (let j = 0; j < vertsPerRow; j++) {
        // Flip row to match geographic orientation
        const bufRow = Math.floor(((SUBS - i) / SUBS) * (hmData.height - 1));
        const bufCol = Math.floor((j        / SUBS) * (hmData.width  - 1));
        const h      = hmData.buffer[bufRow * hmData.width + bufCol] * MAX_HEIGHT;
        positions[(i * vertsPerRow + j) * 3 + 1] = h;
      }
    }
    ground.setVerticesData(VertexBuffer.PositionKind, positions);
    ground.updateFacetData();
    ground.refreshBoundingInfo();
  } catch (e) {
    console.warn('Height application failed:', e);
  }

  ground.receiveShadows = true;
  return ground;
}

function applyTerrainMaterial(ground, scene) {
  const mat  = new StandardMaterial('terrainMat', scene);
  const SIZE = 512;
  const tex  = new DynamicTexture('terrainColour', SIZE, scene, false);
  const ctx  = tex.getContext();
  const g    = ctx.createLinearGradient(0, SIZE, 0, 0);
  g.addColorStop(0.00, '#c2a96e');
  g.addColorStop(0.04, '#7ab648');
  g.addColorStop(0.25, '#3a8c2a');
  g.addColorStop(0.55, '#2a6e1e');
  g.addColorStop(0.75, '#6b5a48');
  g.addColorStop(0.90, '#8a7a6e');
  g.addColorStop(1.00, '#c0b8b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  tex.update();
  mat.diffuseTexture = tex;
  mat.specularColor  = new Color3(0.04, 0.04, 0.04);
  ground.material    = mat;
}