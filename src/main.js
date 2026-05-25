import {
  Engine, Scene, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4, ArcRotateCamera,
  MeshBuilder, StandardMaterial
} from '@babylonjs/core';

import { buildTerrain }                    from './terrain/TerrainMesh.js';
import { buildOcean }                      from './terrain/OceanPlane.js';
import { fetchSVGRoads, SVG_ROADS }        from './map/OSMFetcher.js';
import { renderRoads, renderJunctions }    from './map/RoadRenderer.js';
import { VanController }                   from './vehicles/VanController.js';
import { buildArgyleAirport }              from './world/ArgyleAirport.js';

let _engine, _scene, _van, _camera, _roads = [];
let _paused = false;

// ── Loading screen helpers ────────────────────────────────────────────────────
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

// ── Main game entry point ─────────────────────────────────────────────────────
window._startCariVan = async function(vehicleType, missionType) {
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

    // ── Lighting ────────────────────────────────────────────────────────────
    setProgress(8, 'Setting up lighting…');
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), _scene);
    ambient.intensity   = 1.0;
    ambient.diffuse     = new Color3(1, 0.97, 0.88);
    ambient.groundColor = new Color3(0.25, 0.45, 0.20);

    const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, -0.3), _scene);
    sun.intensity = 1.0;

    // ── Terrain ─────────────────────────────────────────────────────────────
    setProgress(18, 'Loading terrain…');
    const terrain = await buildTerrain(_scene, msg => setProgress(28, msg));

    // ── Ocean ───────────────────────────────────────────────────────────────
    setProgress(42, 'Filling the Caribbean Sea…');
    buildOcean(_scene);

    // ── Roads — fetch live from OpenStreetMap, fall back to baked data ──────
    setProgress(50, 'Fetching live SVG roads from OpenStreetMap…');
    let roadData = null;
    try {
      roadData = await fetchSVGRoads(msg => setProgress(56, msg));
      if (!roadData || Object.keys(roadData).length === 0) {
        throw new Error('Road data empty');
      }
      setProgress(62, `Loaded ${Object.keys(roadData).length} roads ✅`);
    } catch (err) {
      console.warn('Live OSM fetch failed — using baked SVG roads:', err.message);
      roadData = SVG_ROADS;
      setProgress(62, 'Using baked SVG road network…');
    }

    // ── Render roads onto terrain ────────────────────────────────────────────
    setProgress(65, 'Rendering road network on terrain…');
    _roads = renderRoads(_scene, terrain, roadData) || [];
    renderJunctions(_scene, terrain, roadData);

    // ── World props ──────────────────────────────────────────────────────────
    setProgress(72, 'Building Argyle Airport…');
    buildArgyleAirport(_scene, terrain);

    // ── Van spawn — Kingstown centre ─────────────────────────────────────────
    setProgress(80, 'Spawning van…');
    const sx = 5278, sz = -8550;
    const rawH = terrain.getHeightAtCoordinates(sx, sz) || 0;
    const sy   = Math.max(rawH, 20) + 3;

    _van = new VanController(_scene, terrain, new Vector3(sx, sy, sz));
    window.gameVan = _van;

    // Orange spawn marker — disappears after 5s
    const marker    = MeshBuilder.CreateBox('marker', { size: 8 }, _scene);
    marker.position = new Vector3(sx, sy + 4, sz);
    const markerMat = new StandardMaterial('markerMat', _scene);
    markerMat.diffuseColor  = new Color3(1, 0.2, 0);
    markerMat.emissiveColor = new Color3(0.8, 0.1, 0);
    marker.material = markerMat;
    setTimeout(() => { if (marker) marker.dispose(); }, 5000);

    // ── Camera — GTA-style follow ────────────────────────────────────────────
    setProgress(90, 'Setting up camera…');
    _camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2,   // alpha — behind van
      1.1,            // beta  — 63° from top, looking down
      20,             // radius
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

    // Smooth camera follow
    _scene.onBeforeRenderObservable.add(() => {
      if (_van && _camera) {
        const t = _van.root.position.clone();
        t.y += 1;
        _camera.target = Vector3.Lerp(_camera.target, t, 0.1);
      }
    });

    // ── Game loop ────────────────────────────────────────────────────────────
    let last = performance.now();
    _engine.runRenderLoop(() => {
      if (_paused) return;
      const now = performance.now();
      _van.update(now - last);
      last = now;

      // HUD updates
      if (window.updateHUD) {
        window.updateHUD(_van.getSpeed(), _van.getGear());
      }
      if (window.updateMinimap) {
        window.updateMinimap(_van.root.position.x, _van.root.position.z, _roads);
      }
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

// ── Game control hooks ────────────────────────────────────────────────────────
window._pauseGame      = () => { _paused = true; };
window._resumeGame     = () => { _paused = false; };
window._stopGame       = () => { _paused = true; };
window._setCamDistance = (r) => { if (_camera) _camera.radius = r; };
window._applySettings  = (s) => {};

window.SM = window.SM || (typeof SM !== 'undefined' ? SM : null);

// ── Auto-hide loading and show menu on first load ─────────────────────────────
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