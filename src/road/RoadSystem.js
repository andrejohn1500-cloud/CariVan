import { Vector3, MeshBuilder, StandardMaterial, Color3 }
  from '@babylonjs/core';
import { ROAD_LOOP, COASTAL_MAX_Y } from './RoadNetwork.js';

export const ROAD_WIDTH    = 80;
export const ROAD_BOUNDARY = 22;
export const ROAD_EDGE     = 20;

// Maximum terrain height before a point is considered "in a mountain"
const MAX_ROAD_HEIGHT = 80;
// How many units to step toward ocean when clamping
const COAST_STEP = 120;
// Max attempts to find a safe coastal position
const MAX_CLAMP_TRIES = 12;

export class RoadSystem {
  constructor(scene, terrain) {
    this.scene       = scene;
    this.terrain     = terrain;
    this.points      = this._buildSpline();
    this.points      = this._smoothY(this.points, 35);
    this.cumDist     = this._calcCumDist();
    this.totalLength = this.cumDist[this.cumDist.length - 1];
    this._buildRoadMesh();
  }

  // ── Safety: query terrain height at world coords ──────────────────────────
  _terrainH(x, z) {
    try {
      const h = this.terrain?.getHeightAtCoordinates?.(x, z);
      if (h == null || isNaN(h)) return 0;
      return h;
    } catch { return 0; }
  }

  // ── Clamp a point to coastal zone ─────────────────────────────────────────
  // If the point is in a mountain, nudge it toward the ocean (west = -x)
  // until it finds safe ground or gives up
  _clampToCoast(x, z) {
    let cx = x;
    const h = this._terrainH(cx, z);
    if (h <= MAX_ROAD_HEIGHT) return cx; // already safe

    // Determine which coast side to nudge toward
    // West coast: nudge toward lower x (toward ocean)
    // East coast: nudge toward higher x (toward ocean)
    // We detect by whether x < island centre (~4800)
    const isWestCoast = x < 4800;
    const nudge = isWestCoast ? -COAST_STEP : COAST_STEP;

    for (let i = 0; i < MAX_CLAMP_TRIES; i++) {
      cx += nudge;
      if (this._terrainH(cx, z) <= MAX_ROAD_HEIGHT) return cx;
    }
    // Last resort — return original and let it render
    return x;
  }

  _groundY(x, z) {
    return 2; // Force road flat at coastal sea level
  }

  _smoothY(pts, passes) {
    for (let p = 0; p < passes; p++) {
      for (let i = 1; i < pts.length - 1; i++) {
        const avg = (pts[i-1].y + pts[i].y * 2 + pts[i+1].y) / 4;
        pts[i] = new Vector3(pts[i].x, avg, pts[i].z);
      }
    }
    return pts;
  }

  _buildSpline() {
    const raw   = ROAD_LOOP.map(([x, z]) => {
      // Clamp each raw waypoint to coast before spline
      const safeX = this._clampToCoast(x, z);
      return { x: safeX, z };
    });

    const pts   = [];
    const N     = raw.length;
    const STEPS = 40;

    for (let i = 0; i < N; i++) {
      const p0 = raw[(i - 1 + N) % N];
      const p1 = raw[i];
      const p2 = raw[(i + 1) % N];
      const p3 = raw[(i + 2) % N];

      for (let s = 0; s < STEPS; s++) {
        const t  = s / STEPS;
        const t2 = t * t;
        const t3 = t2 * t;
        const f  = (a, b, c, d) =>
          0.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
        let x = f(p0.x, p1.x, p2.x, p3.x);
        const z = f(p0.z, p1.z, p2.z, p3.z);

        // Also clamp each interpolated spline point
        x = this._clampToCoast(x, z);

        pts.push(new Vector3(x, this._groundY(x, z), z));
      }
    }
    return pts;
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
    const t    = (d - this.cumDist[lo]) /
                 (this.cumDist[lo+1] - this.cumDist[lo] + 0.0001);
    const pos  = Vector3.Lerp(this.points[lo], this.points[lo+1], t);
    const tang = this.points[lo+1].subtract(this.points[lo]).normalize();
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
      const d  = dx*dx + dz*dz;
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
      pathL.push(new Vector3(p.x - perp.x*half, y, p.z - perp.z*half));
      pathR.push(new Vector3(p.x + perp.x*half, y, p.z + perp.z*half));
    }

    // ── Asphalt ───────────────────────────────────────────────────────────
    const road = MeshBuilder.CreateRibbon('road', {
      pathArray: [pathL, pathR],
      closePath: false,
      sideOrientation: 2,
    }, this.scene);
    const roadMat = new StandardMaterial('roadMat', this.scene);
    roadMat.diffuseColor    = new Color3(0.50, 0.50, 0.50);
    roadMat.emissiveColor   = new Color3(0.42, 0.42, 0.42);
    roadMat.specularColor   = new Color3(0.08, 0.08, 0.08);
    roadMat.backFaceCulling = false;
    roadMat.disableLighting = true;
    road.material           = roadMat;

    // ── Yellow centre line ────────────────────────────────────────────────
    const cL = [], cR = [];
    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.22;
      cL.push(new Vector3(p.x - perp.x*0.9, y, p.z - perp.z*0.9));
      cR.push(new Vector3(p.x + perp.x*0.9, y, p.z + perp.z*0.9));
    }
    const centre = MeshBuilder.CreateRibbon('centre', {
      pathArray: [cL, cR],
      closePath: false,
      sideOrientation: 2,
    }, this.scene);
    const cMat = new StandardMaterial('centreMat', this.scene);
    cMat.diffuseColor    = new Color3(1.0, 0.85, 0.0);
    cMat.emissiveColor   = new Color3(0.30, 0.24, 0.0);
    cMat.backFaceCulling = false;
    centre.material      = cMat;

    // ── White edge ribbons ────────────────────────────────────────────────
    [pathL, pathR].forEach((path, s) => {
      const eL = [], eR = [];
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const perp = this._perp(i);
        const dir  = s === 0 ? -1 : 1;
        const y    = p.y + 0.18;
        eL.push(new Vector3(p.x + perp.x*dir*0.5, y, p.z + perp.z*dir*0.5));
        eR.push(new Vector3(p.x - perp.x*dir*0.5, y, p.z - perp.z*dir*0.5));
      }
      const edge = MeshBuilder.CreateRibbon('edge'+s, {
        pathArray: [eL, eR],
        closePath: false,
        sideOrientation: 2,
      }, this.scene);
      const em = new StandardMaterial('edgeMat'+s, this.scene);
      em.diffuseColor    = new Color3(0.95, 0.95, 0.95);
      em.emissiveColor   = new Color3(0.16, 0.16, 0.16);
      em.backFaceCulling = false;
      edge.material      = em;
    });

    // ── Forest green verges ───────────────────────────────────────────────
    [
      { path: pathL, name: 'vergeL', dir: -1 },
      { path: pathR, name: 'vergeR', dir:  1 },
    ].forEach(({ path, name, dir }) => {
      const vIn  = [];
      const vOut = [];
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const perp = this._perp(i);
        const ox   = p.x + perp.x * dir * 8;
        const oz   = p.z + perp.z * dir * 8;
        vIn.push(new Vector3(p.x, p.y - 0.01, p.z));
        vOut.push(new Vector3(ox, 2.0, oz));
      }
      const verge = MeshBuilder.CreateRibbon(name, {
        pathArray: [vIn, vOut],
        closePath: false,
        sideOrientation: 2,
      }, this.scene);
      const vm = new StandardMaterial(name+'Mat', this.scene);
      vm.diffuseColor    = new Color3(0.12, 0.26, 0.07);
      vm.specularColor   = new Color3(0.01, 0.02, 0.01);
      vm.backFaceCulling = false;
      verge.material     = vm;
    });
  }
}