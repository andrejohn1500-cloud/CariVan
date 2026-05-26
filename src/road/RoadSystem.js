import { Vector3, MeshBuilder, StandardMaterial, Color3, VertexBuffer }
  from '@babylonjs/core';
import { VILLAGE_ANCHORS, FANCY_ROUNDABOUT, ROAD_LOOP } from './RoadNetwork.js';

export const ROAD_WIDTH    = 80;
export const ROAD_BOUNDARY = 22;
export const ROAD_EDGE     = 20;

const MAX_ROAD_SLOPE  = 60;
const WATER_HEIGHT    = 2;
const COAST_NUDGE     = 150;
const MAX_NUDGE_TRIES = 20;
const PATH_SUBDIVIDE  = 12;
const FLATTEN_RADIUS  = 120;
const ROAD_Y          = 2;

export class RoadSystem {
  constructor(scene, terrain) {
    this.scene   = scene;
    this.terrain = terrain;
    this.points  = this._buildProceduralPath();
    this.points  = this._smoothPath(this.points, 8);
    this._flattenTerrainUnderRoad();
    this.cumDist     = this._calcCumDist();
    this.totalLength = this.cumDist[this.cumDist.length - 1];
    this._buildRoadMesh();
  }

  _h(x, z) {
    try {
      const h = this.terrain?.getHeightAtCoordinates?.(x, z);
      if (h == null || isNaN(h)) return 0;
      return h;
    } catch { return 0; }
  }

  _isWater(x, z) {
    return this._h(x, z) < WATER_HEIGHT;
  }

  _isMountain(x, z) {
    return this._h(x, z) > MAX_ROAD_SLOPE;
  }

  _isSafe(x, z) {
    return !this._isWater(x, z) && !this._isMountain(x, z);
  }

  _findSafePoint(x, z) {
    if (this._isSafe(x, z)) return { x, z };

    const dirs = [
      [ 1, 0], [-1, 0], [0,  1], [0, -1],
      [ 1, 1], [-1, 1], [ 1,-1], [-1,-1],
    ];

    for (let dist = COAST_NUDGE; dist <= COAST_NUDGE * MAX_NUDGE_TRIES; dist += COAST_NUDGE) {
      for (const [dx, dz] of dirs) {
        const nx = x + dx * dist;
        const nz = z + dz * dist;
        if (this._isSafe(nx, nz)) return { x: nx, z: nz };
      }
    }
    return { x, z };
  }

  _buildSegment(x1, z1, x2, z2) {
    const pts = [];
    for (let i = 0; i <= PATH_SUBDIVIDE; i++) {
      const t    = i / PATH_SUBDIVIDE;
      const rx   = x1 + (x2 - x1) * t;
      const rz   = z1 + (z2 - z1) * t;
      const safe = this._findSafePoint(rx, rz);
      pts.push(new Vector3(safe.x, ROAD_Y, safe.z));
    }
    return pts;
  }

  _buildRoundabout() {
    const { cx, cz, radius, steps } = FANCY_ROUNDABOUT;
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const angle = Math.PI + (i / steps) * Math.PI * 2;
      const rx    = cx + Math.cos(angle) * radius;
      const rz    = cz + Math.sin(angle) * radius;
      const safe  = this._findSafePoint(rx, rz);
      pts.push(new Vector3(safe.x, ROAD_Y, safe.z));
    }
    return pts;
  }

  _buildProceduralPath() {
    const allPts = [];

    const westCoast = [
      'Kingstown', 'ArnosVale', 'Questelles', 'Layou',
      'Barrouallie', 'Keartons', 'Troumaca', 'Wallibou',
      'Chateaubelair', 'Richmond', 'FancyNorthTip'
    ];

    const eastCoast = [
      'Owia', 'SandyBay', 'Georgetown',
      'Biabou', 'Argyle', 'Kingstown'
    ];

    const anchorMap = {};
    for (const a of VILLAGE_ANCHORS) {
      anchorMap[a.name] = this._findSafePoint(a.x, a.z);
    }

    // West coast — Kingstown north to Fancy
    for (let i = 0; i < westCoast.length - 1; i++) {
      const a   = anchorMap[westCoast[i]];
      const b   = anchorMap[westCoast[i + 1]];
      const seg = this._buildSegment(a.x, a.z, b.x, b.z);
      allPts.push(...(i === 0 ? seg : seg.slice(1)));
    }

    // Roundabout at Fancy north tip
    const roundabout = this._buildRoundabout();
    allPts.push(...roundabout.slice(1));

    // East coast — Owia south to Kingstown
    for (let i = 0; i < eastCoast.length - 1; i++) {
      const a   = anchorMap[eastCoast[i]];
      const b   = anchorMap[eastCoast[i + 1]];
      const seg = this._buildSegment(a.x, a.z, b.x, b.z);
      allPts.push(...seg.slice(1));
    }

    if (allPts.length < 10) {
      console.error('Procedural path failed — using fallback');
      return [
        new Vector3(5278, 25.5, -8550),
        new Vector3(5200, 25.5, -8500),
        new Vector3(5100, 25.5, -8450),
        new Vector3(5000, 25.5, -8400),
      ];
    }

    return allPts;
  }

  _smoothPath(pts, passes) {
    for (let p = 0; p < passes; p++) {
      for (let i = 1; i < pts.length - 1; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const next = pts[i + 1];
        pts[i] = new Vector3(
          (prev.x + curr.x * 2 + next.x) / 4,
          ROAD_Y,
          (prev.z + curr.z * 2 + next.z) / 4
        );
      }
    }
    return pts;
  }

  _flattenTerrainUnderRoad() {
    if (!this.terrain) return;
    try {
      const positions = this.terrain.getVerticesData(VertexBuffer.PositionKind);
      if (!positions) return;

      const MAP_W       = 29000;
      const MAP_H       = 45000;
      const SUBS        = 200;
      const vertsPerRow = SUBS + 1;

      for (let i = 0; i < vertsPerRow; i++) {
        for (let j = 0; j < vertsPerRow; j++) {
          const worldX = -MAP_W / 2 + (j / SUBS) * MAP_W;
          const worldZ = -MAP_H / 2 + (i / SUBS) * MAP_H;

          let minDist = Infinity;
          for (const rp of this.points) {
            const dx = rp.x - worldX;
            const dz = rp.z - worldZ;
            const d  = dx * dx + dz * dz;
            if (d < minDist) minDist = d;
          }

          if (minDist < FLATTEN_RADIUS * FLATTEN_RADIUS) {
            const idx      = (i * vertsPerRow + j) * 3 + 1;
            const dist     = Math.sqrt(minDist);
            const blend    = Math.max(0, 1 - dist / FLATTEN_RADIUS);
            const currH    = positions[idx];
            positions[idx] = currH * (1 - blend) + ROAD_Y * blend;
          }
        }
      }

      this.terrain.setVerticesData(VertexBuffer.PositionKind, positions);
      this.terrain.updateFacetData?.();
      this.terrain.refreshBoundingInfo?.();
    } catch (e) {
      console.warn('Road flattening failed:', e);
    }
  }

  _calcCumDist() {
    const c = [0];
    for (let i = 1; i < this.points.length; i++)
      c.push(c[i-1] + Vector3.Distance(this.points[i], this.points[i-1]));
    return c;
  }

  getAtDist(d) {
    d = ((d % this.totalLength) + this.totalLength) % this.totalLength;
    let lo = 0, hi = this.cumDist.length - 2;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cumDist[mid + 1] < d) lo = mid + 1;
      else hi = mid;
    }
    const t   = (d - this.cumDist[lo]) /
                (this.cumDist[lo + 1] - this.cumDist[lo] + 0.0001);
    const pos  = Vector3.Lerp(this.points[lo], this.points[lo + 1], t);
    const tang = this.points[lo + 1].subtract(this.points[lo]).normalize();
    return { pos, tang, heading: Math.atan2(tang.x, tang.z) };
  }

  getCarTransform(d, lateral) {
    const { pos, tang, heading } = this.getAtDist(d);
    const perp = new Vector3(tang.z, 0, -tang.x);
    const wx   = pos.x + perp.x * lateral;
    const wz   = pos.z + perp.z * lateral;
    return { position: new Vector3(wx, 25.5, wz), heading };
  }

  findNearestDist(x, z) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < this.points.length; i++) {
      const dx = this.points[i].x - x;
      const dz = this.points[i].z - z;
      const d  = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = this.cumDist[i]; }
    }
    return best;
  }

  _perp(i) {
    const N    = this.points.length;
    const next = this.points[(i + 1) % N];
    const prev = this.points[(i - 1 + N) % N];
    const tang = next.subtract(prev).normalize();
    return new Vector3(tang.z, 0, -tang.x);
  }

  _buildRoadMesh() {
    const half  = ROAD_WIDTH / 2;
    const pathL = [];
    const pathR = [];

    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.10;
      pathL.push(new Vector3(p.x - perp.x * half, y, p.z - perp.z * half));
      pathR.push(new Vector3(p.x + perp.x * half, y, p.z + perp.z * half));
    }

    const road    = MeshBuilder.CreateRibbon('road', {
      pathArray: [pathL, pathR], closePath: false, sideOrientation: 2,
    }, this.scene);
    const roadMat = new StandardMaterial('roadMat', this.scene);
    roadMat.diffuseColor    = new Color3(0.50, 0.50, 0.50);
    roadMat.emissiveColor   = new Color3(0.42, 0.42, 0.42);
    roadMat.specularColor   = new Color3(0.08, 0.08, 0.08);
    roadMat.backFaceCulling = false;
    roadMat.disableLighting = true;
    road.material           = roadMat;

    const cL = [], cR = [];
    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.22;
      cL.push(new Vector3(p.x - perp.x * 0.9, y, p.z - perp.z * 0.9));
      cR.push(new Vector3(p.x + perp.x * 0.9, y, p.z + perp.z * 0.9));
    }
    const centre = MeshBuilder.CreateRibbon('centre', {
      pathArray: [cL, cR], closePath: false, sideOrientation: 2,
    }, this.scene);
    const cMat = new StandardMaterial('centreMat', this.scene);
    cMat.diffuseColor    = new Color3(1.0, 0.85, 0.0);
    cMat.emissiveColor   = new Color3(0.30, 0.24, 0.0);
    cMat.backFaceCulling = false;
    centre.material      = cMat;

    [pathL, pathR].forEach((path, s) => {
      const eL = [], eR = [];
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const perp = this._perp(i);
        const dir  = s === 0 ? -1 : 1;
        const y    = p.y + 0.18;
        eL.push(new Vector3(p.x + perp.x * dir * 0.5, y, p.z + perp.z * dir * 0.5));
        eR.push(new Vector3(p.x - perp.x * dir * 0.5, y, p.z - perp.z * dir * 0.5));
      }
      const edge = MeshBuilder.CreateRibbon('edge' + s, {
        pathArray: [eL, eR], closePath: false, sideOrientation: 2,
      }, this.scene);
      const em = new StandardMaterial('edgeMat' + s, this.scene);
      em.diffuseColor    = new Color3(0.95, 0.95, 0.95);
      em.emissiveColor   = new Color3(0.16, 0.16, 0.16);
      em.backFaceCulling = false;
      edge.material      = em;
    });

    [
      { path: pathL, name: 'vergeL', dir: -1 },
      { path: pathR, name: 'vergeR', dir:  1 },
    ].forEach(({ path, name, dir }) => {
      const vIn = [], vOut = [];
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const perp = this._perp(i);
        vIn.push(new Vector3(p.x, p.y - 0.01, p.z));
        vOut.push(new Vector3(
          p.x + perp.x * dir * 8,
          ROAD_Y,
          p.z + perp.z * dir * 8
        ));
      }
      const verge = MeshBuilder.CreateRibbon(name, {
        pathArray: [vIn, vOut], closePath: false, sideOrientation: 2,
      }, this.scene);
      const vm = new StandardMaterial(name + 'Mat', this.scene);
      vm.diffuseColor    = new Color3(0.12, 0.26, 0.07);
      vm.specularColor   = new Color3(0.01, 0.02, 0.01);
      vm.backFaceCulling = false;
      verge.material     = vm;
    });
  }
}