import {
  Engine, Scene, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4, ArcRotateCamera, ShadowGenerator
} from '@babylonjs/core';

import { buildTerrain }                 from './terrain/TerrainMesh.js';
import { buildOcean }                   from './terrain/OceanPlane.js';
import { fetchSVGRoads }                from './map/OSMFetcher.js';
import { renderRoads, renderJunctions } from './map/RoadRenderer.js';
import { VanController }                from './vehicles/VanController.js';
import { buildCivic, buildFitHybrid }   from './vehicles/PlayerCars.js';
import { buildArgyleAirport }           from './world/ArgyleAirport.js';
import { buildSVGLocations } from './world/SVGLocations.js';
let _engine, _scene, _van, _camera, _roads = [];
let _paused = false;

function setProgress(pct, msg) {
  const f = document.getElementById('progress-fill');
  const t = document.getElementById('status-text');
  if (f) f.style.width = pct + '%';
  if (t) t.textContent = msg;
}

function hideLoading() {
  const el = document.getElementById('loading');
  if (!el) return;
  el.style.transition = 'opacity 0.5s';
  el.style.opacity = '0';
  setTimeout(() => el.remove(), 600);
}

// Called by SM.startGame()
window._startCariVan = async function(vehicleType, missionType) {
  const canvas = document.getElementById('renderCanvas');

  if (_scene) { _scene.dispose(); _scene = null; _van = null; }
  if (!_engine) {
    _engine = new Engine(canvas, true);
    window.addEventListener('resize', () => _engine.resize());
  }

  // Show loading
  const loading = document.createElement('div');
  loading.id = 'loading';
  loading.innerHTML = `
    <h1 style="color:#4CAF72;font-size:2rem;font-family:sans-serif">🇻🇨 CariVan</h1>
    <p style="color:#888;font-family:sans-serif;margin:8px 0 24px">Loading ${missionType}…</p>
    <div id="progress-bar" style="width:240px;height:5px;background:#1e1e1e;border-radius:3px;overflow:hidden">
      <div id="progress-fill" style="height:100%;width:0%;background:#4CAF72;transition:width 0.25s"></div>
    </div>
    <div id="status-text" style="margin-top:10px;font-size:0.78rem;color:#555;font-family:sans-serif">Starting…</div>
  `;
  loading.style.cssText = 'position:fixed;inset:0;z-index:200;background:#0d1117;display:flex;flex-direction:column;align-items:center;justify-content:center';
  document.body.appendChild(loading);

  _scene = new Scene(_engine);
  _scene.clearColor = new Color4(0.42, 0.72, 0.90, 1);

  setProgress(8, 'Setting up lighting…');
  const ambient = new HemisphericLight('ambient', new Vector3(0,1,0), _scene);
  ambient.intensity = 0.7;
  ambient.diffuse = new Color3(1, 0.97, 0.88);
  ambient.groundColor = new Color3(0.25, 0.45, 0.20);

  const sun = new DirectionalLight('sun', new Vector3(-0.5,-1,-0.3), _scene);
  sun.intensity = 1.2; sun.position = new Vector3(5000, 8000, 3000);
  const shadows = new ShadowGenerator(1024, sun);
  shadows.useBlurExponentialShadowMap = true;

  setProgress(18, 'Loading terrain…');
  const terrain = await buildTerrain(_scene, msg => setProgress(28, msg));
  shadows.addShadowCaster(terrain);

  setProgress(40, 'Filling the Caribbean Sea…');
  buildOcean(_scene);

  setProgress(50, 'Laying SVG roads…');
  await fetchSVGRoads(msg => setProgress(58, msg));

  setProgress(64, 'Rendering road network…');
  _roads = renderRoads(_scene, terrain) || [];
  renderJunctions(_scene, terrain);

  setProgress(72, 'Building Argyle Airport…');
  buildArgyleAirport(_scene, terrain);

  setProgress(80, 'Spawning vehicles…');
  const sx = -1200, sz = -8000;
  const sy = terrain.getHeightAtCoordinates(sx, sz) + 1.5;
  _van = new VanController(_scene, terrain, new Vector3(sx, sy, sz));
  shadows.addShadowCaster(_van.mesh);
  window.gameVan = _van;

  buildCivic(_scene, new Vector3(-800, terrain.getHeightAtCoordinates(-800,-7500)+0.8, -7500));
  buildFitHybrid(_scene, new Vector3(-600, terrain.getHeightAtCoordinates(-600,-7200)+0.86, -7200));

  setProgress(90, 'Camera…');
  _camera = new ArcRotateCamera('cam', -Math.PI/2, Math.PI/3.5, 28, _van.mesh.position, _scene);
  _camera.lowerRadiusLimit = 10;
  _camera.upperRadiusLimit = 80;
  _camera.upperBetaLimit = Math.PI / 2.1;
  _camera.attachControl(canvas, true);

  _scene.onBeforeRenderObservable.add(() => {
    if (_van && _camera) {
      _camera.target = Vector3.Lerp(_camera.target, _van.mesh.position, 0.08);
    }
  });

  let last = performance.now();
  _engine.runRenderLoop(() => {
    if (_paused) return;
    const now = performance.now();
    _van.update(now - last);
    last = now;

    // HUD
    const gear = _van.speed >= 0 ? 'D' : 'R';
    if (window.updateHUD) window.updateHUD(_van.getSpeed(), gear);
    if (window.updateMinimap) window.updateMinimap(
      _van.root.position.x, _van.root.position.z, _roads
    );

    // Speed-based wanted level
    if (window.SM) {
      const spd = _van.getSpeed();
      window.SM.setWanted(spd > 100 ? 3 : spd > 70 ? 2 : spd > 50 ? 1 : 0);
    }

    _scene.render();
  });

  setProgress(100, 'St. Vincent ready! 🇻🇨');
  setTimeout(() => {
    hideLoading();
    if (window.SM) window.SM.onGameReady();
  }, 500);
};

window._pauseGame  = () => { _paused = true; };
window._resumeGame = () => { _paused = false; };
window._stopGame   = () => { _paused = true; };
window._setCamDistance = (r) => { if (_camera) _camera.radius = r; };
window._applySettings  = (s) => { /* radio/sfx hooks go here */ };

// Show main menu on load (loading div hides once engine boots)
// Engine boots lazily when Play is pressed — nothing renders until then