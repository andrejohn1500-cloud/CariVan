/**
 * main.js  (UPDATED)
 *
 * CariVan entry point.
 *
 * Screen flow:
 *   mainMenu → garage → loading (game init) → hud ↔ pause
 *
 * The BabylonJS engine and scene are created once on first load.
 * The game world is initialised inside initGame(), which is called
 * by LoadingScreen when the player hits Play.
 */

import {
  Engine, Scene, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4,
  ArcRotateCamera, ShadowGenerator
} from '@babylonjs/core';

import { buildTerrain }              from './terrain/TerrainMesh.js';
import { buildOcean }                from './terrain/OceanPlane.js';
import { fetchSVGRoads }             from './map/OSMFetcher.js';
import { renderRoads, renderJunctions } from './map/RoadRenderer.js';
import { VanController }             from './vehicles/VanController.js';
import { buildCivic, buildFitHybrid } from './vehicles/PlayerCars.js';
import { buildArgyleAirport }        from './world/ArgyleAirport.js';

import { ScreenManager }    from './ui/ScreenManager.js';
import { MainMenu }         from './ui/MainMenu.js';
import { GarageScreen }     from './ui/GarageScreen.js';
import { LoadingScreen }    from './ui/LoadingScreen.js';
import { HUD }              from './ui/HUD.js';
import { PauseScreen }      from './ui/PauseScreen.js';

// ── Load CSS ──────────────────────────────────────────────────────────
const link = document.createElement('link');
link.rel   = 'stylesheet';
link.href  = './src/styles/ui.css';
document.head.appendChild(link);

// ── Globals ───────────────────────────────────────────────────────────
let _engine  = null;
let _scene   = null;
let _van     = null;
let _camera  = null;
let _shadows = null;

// ── Bootstrap ─────────────────────────────────────────────────────────
async function bootstrap() {
  // Create BabylonJS engine (but don't init the world yet)
  const canvas = document.getElementById('renderCanvas');
  _engine = new Engine(canvas, true);

  // Start the screen system
  const sm = new ScreenManager();

  const garage   = new GarageScreen(sm);
  const loading  = new LoadingScreen(sm, (vehicle, onProgress) =>
    initGame(vehicle, onProgress, canvas, sm, garage));
  const hud      = new HUD(sm, () => _van);
  const pause    = new PauseScreen(sm);
  const mainMenu = new MainMenu(sm);

  sm.register('mainMenu', mainMenu);
  sm.register('garage',   garage);
  sm.register('loading',  loading);
  sm.register('hud',      hud);
  sm.register('pause',    pause);

  // Start on main menu
  sm.show('mainMenu');

  // Resize handler
  window.addEventListener('resize', () => { if (_engine) _engine.resize(); });
}

// ── Game world initialisation ─────────────────────────────────────────
async function initGame(vehicle, onProgress, canvas, sm, garage) {
  // If scene already exists, dispose it cleanly
  if (_scene) {
    _scene.dispose();
    _scene = null;
    _van   = null;
  }

  _scene = new Scene(_engine);
  _scene.clearColor = new Color4(0.42, 0.72, 0.90, 1);

  onProgress(8, 'Setting up lighting…');

  // Lighting
  const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), _scene);
  ambient.intensity   = 0.7;
  ambient.diffuse     = new Color3(1, 0.97, 0.88);
  ambient.groundColor = new Color3(0.25, 0.45, 0.20);

  const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3), _scene);
  sun.intensity = 1.2;
  sun.position  = new Vector3(5000, 8000, 3000);

  _shadows = new ShadowGenerator(1024, sun);
  _shadows.useBlurExponentialShadowMap = true;

  onProgress(18, 'Loading terrain elevation…');
  const terrain = await buildTerrain(_scene, msg => onProgress(30, msg));
  _shadows.addShadowCaster(terrain);

  onProgress(42, 'Filling in the Caribbean Sea…');
  buildOcean(_scene);

  onProgress(52, 'Fetching real SVG road data…');
  await fetchSVGRoads(msg => onProgress(60, msg));

  onProgress(65, 'Rendering road network…');
  renderRoads(_scene, terrain);
  renderJunctions(_scene, terrain);

  onProgress(72, 'Building Argyle Airport…');
  buildArgyleAirport(_scene, terrain);

  onProgress(80, 'Spawning vehicles…');
  window.touchInput = { x: 0, y: 0, honk: false };

  // Determine spawn position based on selected vehicle
  // All vehicles now query real terrain height
  const spawnX = -1200, spawnZ = -8000;
  const spawnY = terrain.getHeightAtCoordinates(spawnX, spawnZ) + 1.5;

  _van = new VanController(_scene, terrain, new Vector3(spawnX, spawnY, spawnZ));
  _shadows.addShadowCaster(_van.mesh);

  // Park the other cars with correct terrain height
  const civicX = -800, civicZ = -7500;
  const civicY  = terrain.getHeightAtCoordinates(civicX, civicZ) + 0.8;
  buildCivic(_scene, new Vector3(civicX, civicY, civicZ));

  const fitX = -600, fitZ = -7200;
  const fitY  = terrain.getHeightAtCoordinates(fitX, fitZ) + 0.86;
  buildFitHybrid(_scene, new Vector3(fitX, fitY, fitZ));

  onProgress(90, 'Setting up camera…');
  _camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.5, 28,
    _van.mesh.position, _scene);
  _camera.lowerRadiusLimit = 10;
  _camera.upperRadiusLimit = 80;
  _camera.attachControl(canvas, true);

  // Smooth camera follow
  _scene.onBeforeRenderObservable.add(() => {
    if (_van && _camera) {
      _camera.target = Vector3.Lerp(_camera.target, _van.mesh.position, 0.08);
    }
  });

  // Render loop
  let lastTime = performance.now();
  _engine.runRenderLoop(() => {
    const now = performance.now();
    if (_van) _van.update(now - lastTime);
    lastTime = now;
    _scene.render();
  });

  onProgress(100, 'St. Vincent ready!');

  // Expose for debugging
  window.gameScene = _scene;
  window.gameVan   = _van;
}

// ── Go ────────────────────────────────────────────────────────────────
bootstrap().catch(err => {
  console.error('CariVan bootstrap failed:', err);
});
