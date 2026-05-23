import { MeshBuilder, StandardMaterial, Color3, DynamicTexture } from '@babylonjs/core';

const MAX_HEIGHT = 1234;
const SIZE = 256;

export async function buildTerrain(scene, onProgress) {
      onProgress?.('Generating SVG terrain...');
        const heightData = generateProceduralSVGHeightmap();
          onProgress?.('Building terrain mesh...');
            const ground = buildGroundMesh(heightData, scene);
              applyTerrainMaterial(ground, scene);
                return ground;
}

function generateProceduralSVGHeightmap() {
      const buffer = new Float32Array(SIZE * SIZE);
        for (let row = 0; row < SIZE; row++) {
                for (let col = 0; col < SIZE; col++) {
                          const n = row / (SIZE - 1);
                                const e = col / (SIZE - 1);
                                      let h = 0;
                                            const d1 = Math.sqrt((n - 0.72) ** 2 + (e - 0.52) ** 2);
                                                  h += Math.max(0, 1.0 - d1 * 3.5);
                                                        const ridgeDist = Math.abs(e - 0.50);
                                                              h += Math.max(0, 0.4 - ridgeDist * 2.0) * (0.3 + n * 0.4);
                                                                    const edge = Math.min(n, 1 - n, e, 1 - e);
                                                                          h *= Math.min(1, edge * 6);
                                                                                h += (Math.sin(col * 0.08 + row * 0.3) * 0.5 + 0.5) * 0.06;
                                                                                      buffer[row * SIZE + col] = Math.max(0, Math.min(1, h));
                }
        }
          return { buffer, width: SIZE, height: SIZE };
}

function buildGroundMesh(heightData, scene) {
      const ground = MeshBuilder.CreateGroundFromHeightMap(
            'svg_terrain', null,
                { width: 29000, height: 45000, subdivisions: 200,
                      minHeight: 0, maxHeight: MAX_HEIGHT,
                            bufferWidth: heightData.width, bufferHeight: heightData.height,
                                  heightBuffer: heightData.buffer },
                                      scene
      );
        ground.receiveShadows = true;
          return ground;
}

function applyTerrainMaterial(ground, scene) {
      const mat = new StandardMaterial('terrainMat', scene);
        const tex = new DynamicTexture('terrainColour', 512, scene, false);
          const ctx = tex.getContext();
            const g = ctx.createLinearGradient(0, 512, 0, 0);
              g.addColorStop(0.00, '#c2a96e');
                g.addColorStop(0.06, '#4a7c35');
                  g.addColorStop(0.35, '#2d6b22');
                    g.addColorStop(0.78, '#5a4a3a');
                      g.addColorStop(1.00, '#1a1010');
                        ctx.fillStyle = g;
                          ctx.fillRect(0, 0, 512, 512);
                            tex.update();
                              mat.diffuseTexture = tex;
                                mat.specularColor = new Color3(0.05, 0.05, 0.05);
                                  ground.material = mat;
}
}
      )
}
                }
        }
}
}