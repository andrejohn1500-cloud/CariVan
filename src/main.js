import {
  Engine, Scene, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4, ArcRotateCamera,
  MeshBuilder, StandardMaterial
} from '@babylonjs/core';

import { buildTerrain }                 from './terrain/TerrainMesh.js';
import { buildOcean }                   from './terrain/OceanPlane.js';
import { fetchSVGRoads }                from './map/OSMFetcher.js';
import { renderRoads, renderJunctions } from './map/RoadRenderer.js';
import { VanController }                from './vehicles/VanController.js';
import { buildArgyleAirport }           from './world/ArgyleAirport.js';

let _engine, _scene, _van, _camera, _roads = [];
let _paused = false;

function showLoading(missionType) {
  const el = document.getElementById('loading');
  const p  = document.getElementById('loading-sub');
  if (el) { el.style.display = 'flex'; el.style.opacity = '1'; }
  if (p) p.textContent = 'Loading ' + (missionType || '') + '…';
  setProgress(0, 'Starting…');
}

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
  setTimeout(() => { el.style.display = 'none'; }, 600);
}

window._startCariVan = async function(vehicleType, missionType) {
  try {
    showLoading(missionType);

    const canvas = document.getElementById('renderCanvas');
    if (!canvas) throw new Error('Canvas not found');

    if (_scene) { _scene.dispose(); _scene = null; _van = null; }

    if (!_engine) {
      _engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
      });
      window.addEventListener('resize', () => _engine.resize());
    }

    _scene = new Scene(_engine);
    _scene.clearColor = new Color4(0.42, 0.72, 0.90, 1);

    setProgress(8, 'Setting up lighting…');

    // No ShadowGenerator — was crashing on TransformNode van mesh
    const ambient = new HemisphericLight('ambient', new Vector3(0,1,0), _scene);
    ambient.intensity   = 1.0;
    ambient.diffuse     = new Color3(1, 0.97, 0.88);
    ambient.groundColor = new Color3(0.25, 0.45, 0.20);

    const sun = new DirectionalLight('sun', new Vector3(-0.4,-1,-0.3), _scene);
    sun.intensity = 1.0;

    setProgress(18, 'Loading terrain…');
    const terrain = await buildTerrain(_scene, msg => setProgress(28, msg));

    setProgress(42, 'Filling the Caribbean Sea…');
    buildOcean(_scene);

    setProgress(50, 'Laying SVG roads…');
    await fetchSVGRoads(msg => setProgress(58, msg));

    setProgress(64, 'Rendering road network…');
    _roads = renderRoads(_scene, terrain) || [];
    renderJunctions(_scene, terrain);

    setProgress(72, 'Building Argyle Airport…');
    buildArgyleAirport(_scene, terrain);

    setProgress(80, 'Spawning van…');

    // Fixed spawn — Kingstown area, guaranteed above ground
    // Kingstown in geoToWorld coordinates
const sx = 5278, sz = -8550;
    const rawH = terrain.getHeightAtCoordinates(sx, sz) || 0;
    const sy = Math.max(rawH, 20) + 3;

    _van = new VanController(_scene, terrain, new Vector3(sx, sy, sz));
    window.gameVan = _van;

    // Bright marker cube at van spawn — confirms camera is pointing right
    const marker = MeshBuilder.CreateBox('marker', { size: 8 }, _scene);
    marker.position = new Vector3(sx, sy + 4, sz);
    const markerMat = new StandardMaterial('markerMat', _scene);
    markerMat.diffuseColor = new Color3(1, 0.2, 0);
    markerMat.emissiveColor = new Color3(0.8, 0.1, 0);
    marker.material = markerMat;
    // Remove marker after 5 seconds
    setTimeout(() => { if (marker) marker.dispose(); }, 5000);

    setProgress(90, 'Camera…');

    // ArcRotateCamera — beta=1.1 = 63 degrees from top = looking down 27 degrees
    // This MUST show ground below and sky above
    _camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2,  // behind van
      1.1,           // 63 deg from top — looking down ✅
      20,            // 20 units back
      new Vector3(sx, sy + 1, sz),
      _scene
    );
    _camera.minZ             = 0.1;
    _camera.maxZ             = 50000;
    _camera.lowerBetaLimit   = 0.2;
    _camera.upperBetaLimit   = 1.45;
    _camera.lowerRadiusLimit = 8;
    _camera.upperRadiusLimit = 80;
    _camera.attachControl(canvas, true);

    // Follow van every frame
    _scene.onBeforeRenderObservable.add(() => {
      if (_van && _camera) {
        const t = _van.root.position.clone();
        t.y += 1;
        _camera.target = Vector3.Lerp(_camera.target, t, 0.1);
      }
    });

    let last = performance.now();
    _engine.runRenderLoop(() => {
      if (_paused) return;
      const now = performance.now();
      _van.update(now - last);
      last = now;

      const gear = _van.speed >= 0 ? 'D' : 'R';
      if (window.updateHUD) window.updateHUD(_van.getSpeed(), gear);
      if (window.updateMinimap) window.updateMinimap(
        _van.root.position.x, _van.root.position.z, _roads
      );
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
    }, 800);

  } catch(err) {
    console.error('CariVan failed:', err);
    setProgress(0, '❌ ' + (err.message || String(err)));
    const pf = document.getElementById('progress-fill');
    if (pf) pf.style.background = '#c0392b';
  }
};

window._pauseGame      = () => { _paused = true; };
window._resumeGame     = () => { _paused = false; };
window._stopGame       = () => { _paused = true; };
window._setCamDistance = (r) => { if (_camera) _camera.radius = r; };
window._applySettings  = (s) => {};

window.SM = window.SM || (typeof SM !== 'undefined' ? SM : null);

(function() {
  const el = document.getElementById('loading');
  if (el) {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => {
      el.style.display = 'none';
      if (window.SM) window.SM.show('menu');
    }, 500);
  } else {
    if (window.SM) window.SM.show('menu');
  }
})();