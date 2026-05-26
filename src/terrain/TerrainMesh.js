import {
  MeshBuilder, StandardMaterial, Color3,
  DynamicTexture, VertexBuffer, Vector3
} from '@babylonjs/core';

const SUBS  = 200;
const MAP_W = 29000;
const MAP_H = 45000;

// Road corridor — keep terrain flat here
// West coast road x range: 3200–3600
// East coast road x range: 4800–5700
const ROAD_Y = 2;

export async function buildTerrain(scene, onProgress) {
  if (onProgress) onProgress('Building terrain…');

  const ground = MeshBuilder.CreateGround('svg_terrain', {
    width:        MAP_W,
    height:       MAP_H,
    subdivisions: SUBS,
    updatable:    true,
  }, scene);

  const positions   = ground.getVerticesData(VertexBuffer.PositionKind);
  const vertsPerRow = SUBS + 1;

  for (let i = 0; i < vertsPerRow; i++) {
    for (let j = 0; j < vertsPerRow; j++) {
      const worldX = -MAP_W / 2 + (j / SUBS) * MAP_W;
      const worldZ = -MAP_H / 2 + (i / SUBS) * MAP_H;

      const idx = (i * vertsPerRow + j) * 3 + 1;
      positions[idx] = _terrainHeight(worldX, worldZ);
    }
  }

  ground.setVerticesData(VertexBuffer.PositionKind, positions);
  ground.updateFacetData();
  ground.refreshBoundingInfo();

  ground.getHeightAtCoordinates = (wx, wz) => _terrainHeight(wx, wz);

  applyTerrainMaterial(ground, scene);
  return ground;
}

function _terrainHeight(x, z) {
  // Island boundary — outside island = deep ocean
  const islandW = MAP_W * 0.38;
  const islandH = MAP_H * 0.42;
  const cx = 4600; // island centre x
  const cz = -4200; // island centre z

  // Normalised distance from island centre
  const nx = (x - cx) / islandW;
  const nz = (z - cz) / islandH;
  const distFromCentre = Math.sqrt(nx * nx + nz * nz);

  // Outside island shape = deep ocean
  if (distFromCentre > 1.0) return -800;

  // Island edge — coastal flat zone (road lives here)
  const edgeFade = Math.max(0, 1.0 - distFromCentre / 0.85);

  // Mountain spine — runs north-south through island centre
  // La Soufrière peak in north (z around -3500)
  const mountainX = 4600 + Math.sin((z + 8000) * 0.00012) * 800;
  const distFromSpine = Math.abs(x - mountainX);

  // Mountain height — tallest in north (Soufrière ~1234m)
  const northBias  = Math.max(0, 1.0 - (z + 8000) / 12000);
  const peakHeight = 800 + northBias * 400;

  // Mountain falloff from spine
  const mountainH = Math.max(0,
    peakHeight * Math.exp(-distFromSpine * distFromSpine / (800000))
  );

  // Coastal flat — near road x bands
  // West coast: x 3000–4000 stays flat
  // East coast: x 4800–5800 stays flat
  const isWestCoast = x < 4200;
  const isEastCoast = x > 4400;

  let coastFlat = 0;
  if (isWestCoast) {
    const distFromWestCoast = Math.max(0, x - 2800);
    coastFlat = Math.max(0, 1.0 - distFromWestCoast / 1200);
  } else if (isEastCoast) {
    const distFromEastCoast = Math.max(0, 6200 - x);
    coastFlat = Math.max(0, 1.0 - distFromEastCoast / 1400);
  }

  // Blend: coast is flat, inland rises to mountains
  const baseH    = ROAD_Y + mountainH * (1.0 - coastFlat * 0.9);
  const noiseAmp = 8;
  const noise    =
    Math.sin(x * 0.003 + z * 0.005) * noiseAmp +
    Math.cos(x * 0.007 - z * 0.003) * noiseAmp * 0.5;

  return Math.max(ROAD_Y, baseH + noise) * edgeFade +
    (-800) * (1.0 - edgeFade);
}

function applyTerrainMaterial(ground, scene) {
  const mat  = new StandardMaterial('terrainMat', scene);
  const SIZE = 1024;
  const tex  = new DynamicTexture('terrainColour', SIZE, scene, false);
  const ctx  = tex.getContext();

  // Base tropical elevation gradient
  const g = ctx.createLinearGradient(0, SIZE, 0, 0);
  g.addColorStop(0.00, '#d4b483'); // sandy shore
  g.addColorStop(0.03, '#8ab84a'); // coastal flat
  g.addColorStop(0.10, '#4a9e2f'); // lowland jungle
  g.addColorStop(0.30, '#2d7a1e'); // dense rainforest
  g.addColorStop(0.55, '#1e6016'); // deep canopy
  g.addColorStop(0.70, '#3a5c28'); // upper forest
  g.addColorStop(0.80, '#7a6040'); // rocky slope
  g.addColorStop(0.90, '#8a7060'); // bare rock
  g.addColorStop(1.00, '#c8c0b8'); // peak
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Jungle canopy patches
  for (let i = 0; i < 500; i++) {
    const cx   = Math.random() * SIZE;
    const cy   = SIZE * 0.05 + Math.random() * SIZE * 0.85;
    const r    = 4 + Math.random() * 22;
    const dark = Math.random() > 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = dark
      ? `rgba(15,${50+Math.floor(Math.random()*35)},8,0.28)`
      : `rgba(${35+Math.floor(Math.random()*35)},${105+Math.floor(Math.random()*50)},18,0.18)`;
    ctx.fill();
  }

  // Mist streaks mid-slope
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
    ctx.strokeStyle =
      `rgba(220,235,220,${0.06+Math.random()*0.09})`;
    ctx.lineWidth = 3 + Math.random() * 6;
    ctx.stroke();
  }

  // Rocky peaks — top 20%
  for (let i = 0; i < 120; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE * 0.22;
    const r  = 4 + Math.random() * 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle =
      `rgba(${125+Math.floor(Math.random()*45)},${105+Math.floor(Math.random()*35)},${75+Math.floor(Math.random()*35)},0.36)`;
    ctx.fill();
  }

  tex.update();
  tex.uScale         = 6;
  tex.vScale         = 10;
  mat.diffuseTexture = tex;
  mat.specularColor  = new Color3(0.03, 0.05, 0.02);
  ground.material    = mat;
}