import {
      Engine, Scene, Vector3, HemisphericLight,
        DirectionalLight, Color3, Color4, ArcRotateCamera,
          ShadowGenerator
          } from '@babylonjs/core';
          import { buildTerrain } from './terrain/TerrainMesh.js';
          import { buildOcean } from './terrain/OceanPlane.js';
          import { fetchSVGRoads } from './map/OSMFetcher.js';
          import { VanController } from './vehicles/VanController.js';

          const progressFill = document.getElementById('progress-fill');
          const statusText = document.getElementById('status-text');
          const loadingScreen = document.getElementById('loading');

          function setProgress(pct, message) {
            if (progressFill) progressFill.style.width = `${pct}%`;
              if (statusText) statusText.textContent = message;
              }

              function hideLoading() {
                loadingScreen.style.transition = 'opacity 0.6s ease';
                  loadingScreen.style.opacity = '0';
                    setTimeout(() => loadingScreen.remove(), 700);
                    }

                    async function init() {
                      const canvas = document.getElementById('renderCanvas');
                        const engine = new Engine(canvas, true, { antialias: true });
                          const scene = new Scene(engine);
                            scene.clearColor = new Color4(0.42, 0.72, 0.90, 1);

                              setProgress(10, 'Setting up scene...');

                                const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
                                  ambient.intensity = 0.7;
                                    ambient.diffuse = new Color3(1, 0.97, 0.88);
                                      ambient.groundColor = new Color3(0.25, 0.45, 0.20);

                                        const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3), scene);
                                          sun.intensity = 1.2;
                                            sun.position = new Vector3(5000, 8000, 3000);
                                              const shadowGen = new ShadowGenerator(1024, sun);
                                                shadowGen.useBlurExponentialShadowMap = true;

                                                  setProgress(20, 'Building terrain...');
                                                    const terrain = await buildTerrain(scene, msg => setProgress(30, msg));
                                                      shadowGen.addShadowCaster(terrain);

                                                        setProgress(45, 'Filling in the Caribbean Sea...');
                                                          buildOcean(scene);

                                                            setProgress(55, 'Fetching SVG roads...');
                                                              try {
                                                                  const roadData = await fetchSVGRoads(msg => setProgress(60, msg));
                                                                      setProgress(75, 'Roads loaded!');
                                                                        } catch (err) {
                                                                            setProgress(75, 'Using fallback roads...');
                                                                              }

                                                                                setProgress(80, 'Spawning your van...');
                                                                                  window.touchInput = { x: 0, y: 0, honk: false };
                                                                                    const van = new VanController(scene, terrain, new Vector3(-1200, 10, -8000));
                                                                                      shadowGen.addShadowCaster(van.mesh);

                                                                                        setProgress(88, 'Setting up camera...');
                                                                                          const camera = new ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3.5, 28, van.mesh.position, scene);
                                                                                            camera.lowerRadiusLimit = 10;
                                                                                              camera.upperRadiusLimit = 80;
                                                                                                camera.attachControl(canvas, true);

                                                                                                  scene.onBeforeRenderObservable.add(() => {
                                                                                                      camera.target = Vector3.Lerp(camera.target, van.mesh.position, 0.08);
                                                                                                        });

                                                                                                          let lastTime = performance.now();
                                                                                                            engine.runRenderLoop(() => {
                                                                                                                const now = performance.now();
                                                                                                                    van.update(now - lastTime);
                                                                                                                        lastTime = now;
                                                                                                                            scene.render();
                                                                                                                              });

                                                                                                                                window.addEventListener('resize', () => engine.resize());
                                                                                                                                  setProgress(100, 'Island ready!');
                                                                                                                                    setTimeout(hideLoading, 500);

                                                                                                                                      window.gameScene = scene;
                                                                                                                                        window.gameVan = van;
                                                                                                                                        }

                                                                                                                                        init().catch(err => {
                                                                                                                                          console.error('CariVan init failed:', err);
                                                                                                                                            if (statusText) statusText.textContent = `Error: ${err.message}`;
                                                                                                                                            });
}