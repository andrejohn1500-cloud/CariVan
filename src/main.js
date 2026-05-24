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
    _scene.clearColor = new Color4(0.42, 0.72, 0.90, 1); // Caribbean sky

    setProgress(8, 'Setting up lighting…');

    const ambient = new HemisphericLight('ambient', new Vector3(0,1,0), _scene);
    ambient.intensity   = 0.9;
    ambient.diffuse     = new Color3(1, 0.97, 0.88);
    ambient.groundColor = new Color3(0.25, 0.45, 0.20);

    const sun = new DirectionalLight('sun', new Vector3(-0.5,-1,-0.3), _scene);
    sun.intensity = 1.2;
    sun.position  = new Vector3(5000, 8000, 3000);
    const shadows = new ShadowGenerator(1024, sun);
    shadows.useBlurExponentialShadowMap = true;

    setProgress(18, 'Loading terrain…');
    const terrain = await buildTerrain(_scene, msg => setProgress(28, msg));
    shadows.addShadowCaster(terrain);

    // Ocean at -2 — correct, below island ground level
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

    // Spawn near Kingstown on the leeward coast — known land coordinates
    // These world coords map to ~13.16N, 61.23W which is Kingstown area
    // Kingstown area — correct world coords with flipped heightmap
const sx = -5800, sz = -14400;
const rawH = terrain.getHeightAtCoordinates(sx, sz) || 0;
const sy = Math.max(rawH, 15) + 2;

    _van = new VanController(_scene, terrain, new Vector3(sx, sy, sz));
    shadows.addShadowCaster(_van.mesh);
    window.gameVan = _van;

    setProgress(90, 'Camera…');

    // ── GTA-style follow camera ──────────────────────────────────
    // Starts 1m above van, slightly behind, pitched down ~15 degrees
    // alpha: rotation around Y (behind van = -PI/2)
    // beta:  vertical angle from top pole
    //        PI/2 = horizon level
    //        PI/2 + 0.26 = ~15 degrees below horizon (looking slightly down)
    // radius: 12 world units behind van — close, personal

    _camera = new ArcRotateCamera(
      'cam',
      -Math.PI / 2,          // behind the van
      Math.PI / 2 + 0.26,    // 15 degrees below horizon
      12,                    // ~12 units behind — GTA close distance
      _van.root.position,
      _scene
    );

    // Allow player to tilt up/down but not go underground
    _camera.lowerBetaLimit    = 0.3;           // can look up toward sky
    _camera.upperBetaLimit    = Math.PI / 2 + 0.6; // can look further down
    _camera.lowerRadiusLimit  = 6;             // can zoom in close
    _camera.upperRadiusLimit  = 40;            // can zoom out a bit
    _camera.attachControl(canvas, true);

    // Smooth camera follow — tracks van position every frame
    _scene.onBeforeRenderObservable.add(() => {
      if (_van && _camera) {
        // Target is 1 meter above van root — camera looks at chest height
        const vanPos = _van.root.position.clone();
        vanPos.y += 1.0; // 1 meter above ground level
        _camera.target = Vector3.Lerp(_camera.target, vanPos, 0.08);
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