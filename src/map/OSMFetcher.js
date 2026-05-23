const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export const SVG_BOUNDS = {
      south: 12.97, north: 13.58,
        west: -61.50, east: -61.10,
          worldWidth: 29000, worldHeight: 45000,
};

function bbox() {
      return `${SVG_BOUNDS.south},${SVG_BOUNDS.west},${SVG_BOUNDS.north},${SVG_BOUNDS.east}`;
}

export async function fetchSVGRoads(onProgress) {
      onProgress?.('Fetching SVG road network...');
        const query = `
            [out:json][timeout:60];
                (
                          way["highway"="trunk"](${bbox()});
                                way["highway"="primary"](${bbox()});
                                      way["highway"="secondary"](${bbox()});
                                            way["highway"="tertiary"](${bbox()});
                                                  way["highway"="residential"](${bbox()});
                );
                    out body geom;
                      `;
                        try {
                                const res = await fetch(OVERPASS_URL, {
                                          method: 'POST',
                                                body: `data=${encodeURIComponent(query)}`,
                                                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                                });
                                    if (!res.ok) throw new Error(`OSM fetch failed: ${res.status}`);
                                        return await res.json();
                        } catch (err) {
                                console.warn('OSM road fetch failed, using fallback:', err.message);
                                    return { elements: [{ type: 'way', id: 1,
                                          tags: { highway: 'primary', name: 'Leeward Highway' },
                                                geometry: Array.from({length: 20}, (_, i) => ({
                                                            lat: 13.15 + i * 0.018,
                                                                    lon: -61.22 + Math.sin(i * 0.4) * 0.01
                                                }))
                                    }]};
                        }
}

export function geoToWorld(lat, lon) {
      const { south, north, west, east, worldWidth, worldHeight } = SVG_BOUNDS;
        const x = ((lon - west) / (east - west)) * worldWidth - worldWidth / 2;
          const z = ((lat - south) / (north - south)) * worldHeight - worldHeight / 2;
            return { x, z };
}
}
                                                }))}]}
                        }
                                })
                        }
                )
}
}
}