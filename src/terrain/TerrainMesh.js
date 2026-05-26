import {
  MeshBuilder, StandardMaterial, Color3,
  DynamicTexture, VertexBuffer
} from '@babylonjs/core';

const MAX_HEIGHT = 1234;
const SUBS       = 200;
const MAP_W      = 72500;
const MAP_H      = 112500;

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
  const nx  =  (worldX + MAP_W / 2) / MAP_W;
  const nz  =  (worldZ + MAP_H / 2) / MAP_H;
  const colF = nx * (_hmWidth  - 1);
  const rowF = (1.0 - nz) * (_hmHeight - 1);
  const col  = Math.max(0, Math.min(_hmWidth  - 1, Math.floor(colF)));
  const row  = Math.max(0, Math.min(_hmHeight - 1, Math.floor(rowF)));
  const col1 = Math.min(col + 1, _hmWidth  - 1);
  const row1 = Math.min(row + 1, _hmHeight - 1);
  const tx   = colF - col;
  const tz   = rowF - row;
  const h00  = _hmBuffer[row  * _hmWidth + col ] * MAX_HEIGHT;
  const h10  = _hmBuffer[row  * _hmWidth + col1] * MAX_HEIGHT;
  const h01  = _hmBuffer[row1 * _hmWidth + col ] * MAX_HEIGHT;
  const h11  = _hmBuffer[row1 * _hmWidth + col1] * MAX_HEIGHT;
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
      const SIZE   = 512;
      const canvas = document.createElement('canvas');
      canvas.width  = SIZE;
      canvas.height = SIZE;
      const ctx  = canvas.getContext('2d');
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
        const bufRow = Math.floor(((SUBS - i) / SUBS) * (hmData.height - 1));
        const bufCol = Math.floor((j          / SUBS) * (hmData.width  - 1));
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
  const SIZE = 1024;
  const tex  = new DynamicTexture('terrainColour', SIZE, scene, false);
  const ctx  = tex.getContext();

  // Base tropical elevation gradient — bottom=shore, top=peak
  const g = ctx.createLinearGradient(0, SIZE, 0, 0);
  g.addColorStop(0.00, '#d4b483'); // sandy shore
  g.addColorStop(0.03, '#8ab84a'); // coastal flat
  g.addColorStop(0.10, '#4a9e2f'); // lowland jungle
  g.addColorStop(0.30, '#2d7a1e'); // dense rainforest
  g.addColorStop(0.50, '#1e6016'); // deep canopy
  g.addColorStop(0.68, '#3a5c28'); // upper forest
  g.addColorStop(0.78, '#7a6040'); // rocky slope
  g.addColorStop(0.88, '#8a7060'); // bare rock
  g.addColorStop(0.95, '#a09080'); // summit rock
  g.addColorStop(1.00, '#c8c0b8'); // peak
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Organic sine noise — breaks gradient into natural jungle patches
  for (let y = 0; y < SIZE; y += 2) {
    for (let x = 0; x < SIZE; x += 2) {
      const n1    = Math.sin(x * 0.07 + y * 0.13) * 0.5 + 0.5;
      const n2    = Math.cos(x * 0.11 - y * 0.09) * 0.5 + 0.5;
      const n3    = Math.sin(x * 0.19 + y * 0.07) * 0.5 + 0.5;
      const noise = (n1 + n2 + n3) / 3;
      const r     = Math.floor(30 + noise * 40);
      const gv    = Math.floor(90 + noise * 55);
      const b     = Math.floor(20 + noise * 25);
      const a     = 0.20 + noise * 0.16;
      ctx.fillStyle = `rgba(${r},${gv},${b},${a})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  // Dark canopy blotches — simulate dense tree clusters
  for (let i = 0; i < 400; i++) {
    const cx   = Math.random() * SIZE;
    const cy   = Math.random() * SIZE * 0.85 + SIZE * 0.08;
    const r    = 5 + Math.random() * 24;
    const dark = Math.random() > 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = dark
      ? `rgba(15,${50 + Math.floor(Math.random()*35)},8,0.30)`
      : `rgba(${35+Math.floor(Math.random()*35)},${105+Math.floor(Math.random()*50)},18,0.20)`;
    ctx.fill();
  }

  // Yellow-green lighter canopy highlights — sun catching treetops
  for (let i = 0; i < 200; i++) {
    const cx = Math.random() * SIZE;
    const cy = SIZE * 0.08 + Math.random() * SIZE * 0.78;
    const r  = 3 + Math.random() * 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${100+Math.floor(Math.random()*60)},${160+Math.floor(Math.random()*60)},${20+Math.floor(Math.random()*30)},0.18)`;
    ctx.fill();
  }

  // Pale mist streaks mid-slope — tropical humidity effect
  for (let i = 0; i < 30; i++) {
    const y   = SIZE * 0.25 + Math.random() * SIZE * 0.35;
    const x   = Math.random() * SIZE;
    const len = 60 + Math.random() * 180;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + len*0.3, y - 6,
      x + len*0.7, y + 4,
      x + len, y
    );
    ctx.strokeStyle = `rgba(220,235,220,${0.06 + Math.random()*0.09})`;
    ctx.lineWidth   = 3 + Math.random() * 6;
    ctx.stroke();
  }

  // Rocky patches near peaks — top 20%
  for (let i = 0; i < 120; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE * 0.22;
    const r  = 4 + Math.random() * 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${125+Math.floor(Math.random()*45)},${105+Math.floor(Math.random()*35)},${75+Math.floor(Math.random()*35)},0.38)`;
    ctx.fill();
  }

  // Coastal sand strip — bottom 4%
  const sand = ctx.createLinearGradient(0, SIZE, 0, SIZE * 0.96);
  sand.addColorStop(0,   'rgba(212,185,128,0.92)');
  sand.addColorStop(0.6, 'rgba(185,162,100,0.55)');
  sand.addColorStop(1,   'rgba(140,180,80,0.0)');
  ctx.fillStyle = sand;
  ctx.fillRect(0, SIZE * 0.96, SIZE, SIZE * 0.04);

  tex.update();
  tex.uScale         = 6;
  tex.vScale         = 10;
  mat.diffuseTexture = tex;
  mat.specularColor  = new Color3(0.03, 0.05, 0.02);
  ground.material    = mat;
}