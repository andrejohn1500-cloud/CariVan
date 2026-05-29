import {
  Engine, Scene, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4, ArcRotateCamera,
  MeshBuilder, StandardMaterial
} from '@babylonjs/core';

import { buildTerrain }   from './terrain/TerrainMesh.js';
import { buildOcean }     from './terrain/OceanPlane.js';
import { VehicleController } from './vehicles/VehicleController.js';
import { getProfile }        from './vehicles/VehicleRegistry.js';
import { RoadSystem }     from './road/RoadSystem.js';
import { RoadJogger }     from './world/RoadJogger.js';

let _engine, _scene, _van, _camera, _jogger;
let _paused = false;

function showLoading(missionType) {
  const el = document.getElementById('loading');
  const p  = document.getElementById('loading-sub');
  if (el) { el.style.display = 'flex'; el.style.opacity = '1'; }
  if (p)  p.textContent = 'Loading ' + (missionType || '') + '…';
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
  el.style.opacity    = '0';
  setTimeout(() => { el.style.display = 'none'; }, 600);
}

window._startCariVan = async function (vehicleType, missionType) {
  try {
    showLoading(missionType);

    const canvas = document.getElementById('renderCanvas');
    if (!canvas) throw new Error('Canvas not found');

    if (_scene) { _scene.dispose(); _scene = null; _van = null; _jogger = null; }

    if (!_engine) {
      _engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });
      window.addEventListener('resize', () => _engine.resize());
    }

    _scene = new Scene(_engine);
    _scene.clearColor = new Color4(0.52, 0.78, 0.92, 1);

    // ── Lighting ──────────────────────────────────────────────────────────────
    setProgress(10, 'Setting up lighting…');
    const ambient = new HemisphericLight(
      'ambient', new Vector3(0, 1, 0), _scene);
    ambient.intensity   = 1.2;
    ambient.diffuse     = new Color3(1, 0.97, 0.88);
    ambient.groundColor = new Color3(0.28, 0.48, 0.22);

    const sun = new DirectionalLight(
      'sun', new Vector3(-0.4, -1, -0.2), _scene);
    sun.intensity = 1.3;

    // ── Terrain ───────────────────────────────────────────────────────────────
    setProgress(20, 'Loading terrain…');
    const terrain = await buildTerrain(
      _scene, msg => setProgress(30, msg));

    // ── Ocean ─────────────────────────────────────────────────────────────────
    setProgress(45, 'Filling the Caribbean Sea…');
    buildOcean(_scene);

    // ── Road ──────────────────────────────────────────────────────────────────
    setProgress(60, 'Building island road…');
    const roadSystem = new RoadSystem(_scene, terrain);

    // ── Player car ────────────────────────────────────────────────────────────
    setProgress(80, 'Spawning vehicle…');
    const sx = 4600, sz = -9200, sy = 25.5;

    _van = new VehicleController(
      _scene, terrain,
      new Vector3(sx, sy, sz),
      roadSystem,
      SuzukiSwift
    );
    _van.roadDist = roadSystem.findNearestDist(sx, sz);
    window.gameVan = _van;

    // ── Road jogger (deferred 3s after game starts) ───────────────────────────
    setTimeout(() => {
      try { _jogger = new RoadJogger(_scene, roadSystem); }
      catch (e) { console.warn('Jogger failed:', e.message); }
    }, 3000);

    // ── Camera ────────────────────────────────────────────────────────────────
    setProgress(90, 'Setting up camera…');
    _camera = new ArcRotateCamera(
      'cam', Math.PI / 2, 0.68, 130,
      new Vector3(sx, sy + 1, sz), _scene
    );
    _camera.minZ             = 0.1;
    _camera.maxZ             = 80000;
    _camera.lowerBetaLimit   = 0.20;
    _camera.upperBetaLimit   = 1.40;
    _camera.lowerRadiusLimit = 80;
    _camera.upperRadiusLimit = 280;
    _camera.attachControl(canvas, true);

    // ── Camera follow ─────────────────────────────────────────────────────────
    let _lastCamInput = 0;
    let _manualCam    = false;

    canvas.addEventListener('pointerdown', () => {
      _manualCam = true;
      _lastCamInput = performance.now();
    });
    canvas.addEventListener('pointermove', () => {
      if (_manualCam) _lastCamInput = performance.now();
    });
    canvas.addEventListener('pointerup', () => {
      _lastCamInput = performance.now();
    });

    _scene.onBeforeRenderObservable.add(() => {
      if (!_van || !_camera) return;
      const t = _van.root.position.clone();
      t.y += 1;
      _camera.target = Vector3.Lerp(_camera.target, t, 0.08);
      if (performance.now() - _lastCamInput > 3000) _manualCam = false;
      if (!_manualCam) {
        const targetAlpha = -_van.heading - Math.PI / 2;
        _camera.alpha += (targetAlpha - _camera.alpha) * 0.04;
      }
    });

    // ── Game loop ─────────────────────────────────────────────────────────────
    let last = performance.now();
    _engine.runRenderLoop(() => {
      if (_paused) return;
      const now   = performance.now();
      const delta = now - last;
      last = now;

      _van.update(delta);
      if (_jogger) _jogger.update(
        delta,
        _van.roadDist,
        _van.lateral ?? 0,
        _van.getSpeed()
      );

      if (window.updateHUD)
        window.updateHUD(_van.getSpeed(), _van.getGear());
      if (window.updateMinimap)
        window.updateMinimap(_van.root.position.x, _van.root.position.z, []);
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

  } catch (err) {
    console.error('CariVan failed:', err);
    setProgress(0, '❌ ' + (err.message || String(err)));
    const pf = document.getElementById('progress-fill');
    if (pf) pf.style.background = '#c0392b';
  }
};

window._pauseGame      = () => { _paused = true;  };
window._resumeGame     = () => { _paused = false; };
window._stopGame       = () => { _paused = true;  };
window._setCamDistance = (r) => { if (_camera) _camera.radius = r; };
window._applySettings  = (s) => {};

window.SM = window.SM ||
  (typeof SM !== 'undefined' ? SM : null);

(function () {
  const el = document.getElementById('loading');
  if (el) {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity    = '0';
    setTimeout(() => {
      el.style.display = 'none';
      if (window.SM) window.SM.show('menu');
    }, 500);
  } else {
    if (window.SM) window.SM.show('menu');
  }
})();