import {
  Engine, Scene, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4, ArcRotateCamera,
  MeshBuilder, StandardMaterial
} from '@babylonjs/core';

import { buildTerrain }         from './terrain/TerrainMesh.js';
import { buildOcean }           from './terrain/OceanPlane.js';
import { VanController }        from './vehicles/VanController.js';
import { RoadSystem }           from './road/RoadSystem.js';
import { buildArgyleAirport }   from './world/ArgyleAirport.js';

let _engine, _scene, _van, _camera;
let _paused = false;

// ── Loading helpers ───────────────────────────────────────────────────────────
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

// ── Main entry ────────────────────────────────────────────────────────────────
window._startCariVan = async function (vehicleType, missionType) {
  try {
    showLoading(missionType);

    const canvas = document.getElementById('renderCanvas');
    if (!canvas) throw new Error('Canvas not found');

    if (_scene) { _scene.dispose(); _scene = null; _van = null; }

    if (!_engine) {
      _engine = new Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });
      window.addEventListener('resize', () => _engine.resize());
    }

    _scene = new Scene(_engine);
    _scene.clearColor = new Color4(0.42, 0.72, 0.90, 1);

    // ── Lighting ──────────────────────────────────────────────────────────────
    setProgress(8, 'Setting up lighting…');
    const ambient = new HemisphericLight(
      'ambient', new Vector3(0, 1, 0), _scene);
    ambient.intensity   = 1.1;
    ambient.diffuse     = new Color3(1, 0.97, 0.88);
    ambient.groundColor = new Color3(0.25, 0.45, 0.20);

    const sun = new DirectionalLight(
      'sun', new Vector3(-0.5, -1, -0.3), _scene);
    sun.intensity = 1.2;

    // ── Terrain ───────────────────────────────────────────────────────────────
    setProgress(15, 'Loading terrain…');
    const terrain = await buildTerrain(
      _scene, msg => setProgress(25, msg));

    // ── Ocean ─────────────────────────────────────────────────────────────────
    setProgress(38, 'Filling the Caribbean Sea…');
    buildOcean(_scene);

    // ── Road ─────────────────────────────────────────────────────────────────
    setProgress(50, 'Building island road…');
    const roadSystem = new RoadSystem(_scene, terrain);

    // ── Van spawn ─────────────────────────────────────────────────────────────
    setProgress(70, 'Spawning van…');
    const sx = 5278, sz = -8550;
    const rawH = terrain.getHeightAtCoordinates(sx, sz) || 0;
    const sy   = Math.max(rawH, 20) + 3;

    _van = new VanController(
      _scene, terrain,
      new Vector3(sx, sy, sz),
      roadSystem
    );
    _van.roadDist = roadSystem.findNearestDist(sx, sz);
    window.gameVan = _van;

    // ── Camera ────────────────────────────────────────────────────────────────
    setProgress(85, 'Setting up camera…');
    _camera = new ArcRotateCamera(
      'cam',
      Math.PI / 2,
      0.72,
      150,
      new Vector3(sx, sy + 1, sz),
      _scene
    );
    _camera.minZ             = 0.1;
    _camera.maxZ             = 80000;
    _camera.lowerBetaLimit   = 0.25;
    _camera.upperBetaLimit   = 1.45;
    _camera.lowerRadiusLimit = 40;
    _camera.upperRadiusLimit = 300;
    _camera.attachControl(canvas, true);

    // ── Camera follow + manual pan ────────────────────────────────────────────
    let _lastCamInput = 0;
    let _manualCam    = false;

    canvas.addEventListener('pointerdown', () => {
      _manualCam    = true;
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
      if (performance.now() - _lastCamInput > 3000) {
        _manualCam = false;
      }
      if (!_manualCam) {
        const targetAlpha = -_van.heading - Math.PI / 2;
        _camera.alpha += (targetAlpha - _camera.alpha) * 0.04;
      }
    });

    // ── Game loop ─────────────────────────────────────────────────────────────
    let last = performance.now();
    _engine.runRenderLoop(() => {
      if (_paused) return;
      const now = performance.now();
      _van.update(now - last);
      last = now;

      if (window.updateHUD) {
        window.updateHUD(_van.getSpeed(), _van.getGear());
      }
      if (window.updateMinimap) {
        window.updateMinimap(
          _van.root.position.x,
          _van.root.position.z,
          []
        );
      }
      if (window.SM) {
        const spd = _van.getSpeed();
        window.SM.setWanted(
          spd > 100 ? 3 : spd > 70 ? 2 : spd > 50 ? 1 : 0
        );
      }
      _scene.render();
    });

    setProgress(100, 'St. Vincent ready! 🇻🇨');
    setTimeout(() => {
      hideLoading();
      if (window.SM) window.SM.onGameReady();
    }, 800);

    // ── Airport loads after game running — deferred ───────────────────────────
    setTimeout(() => {
      try { buildArgyleAirport(_scene, terrain); }
      catch (e) { console.warn('Airport failed:', e.message); }
    }, 4000);

  } catch (err) {
    console.error('CariVan failed:', err);
    setProgress(0, '❌ ' + (err.message || String(err)));
    const pf = document.getElementById('progress-fill');
    if (pf) pf.style.background = '#c0392b';
  }
};

// ── Controls ──────────────────────────────────────────────────────────────────
window._pauseGame      = () => { _paused = true;  };
window._resumeGame     = () => { _paused = false; };
window._stopGame       = () => { _paused = true;  };
window._setCamDistance = (r) => { if (_camera) _camera.radius = r; };
window._applySettings  = (s) => {};

window.SM = window.SM ||
  (typeof SM !== 'undefined' ? SM : null);

// ── Auto-hide on first load ───────────────────────────────────────────────────
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