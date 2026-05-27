import { Vector3, MeshBuilder, StandardMaterial, Color3 }
  from '@babylonjs/core';
import { ROAD_LOOP } from './RoadNetwork.js';

export const ROAD_WIDTH    = 200;
export const ROAD_BOUNDARY = 22;
export const ROAD_EDGE     = 20;

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

  _groundY(x, z) {
    return 2;
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
    const raw   = ROAD_LOOP.map(([x, z]) => ({ x, z }));
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
        const x = f(p0.x, p1.x, p2.x, p3.x);
        const z = f(p0.z, p1.z, p2.z, p3.z);
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
    const t   = (d - this.cumDist[lo]) /
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

    // ── Main road surface ─────────────────────────────────────────────────
    const road    = MeshBuilder.CreateRibbon('road', {
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

    // ── Centre yellow line ────────────────────────────────────────────────
    const cL = [], cR = [];
    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.22;
      cL.push(new Vector3(p.x - perp.x*2.5, y, p.z - perp.z*2.5));
      cR.push(new Vector3(p.x + perp.x*2.5, y, p.z + perp.z*2.5));
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

    // ── Left white edge line ──────────────────────────────────────────────
    const llL = [], llR = [];
    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.20;
      llL.push(new Vector3(p.x - perp.x*(half - 4), y, p.z - perp.z*(half - 4)));
      llR.push(new Vector3(p.x - perp.x*(half - 8), y, p.z - perp.z*(half - 8)));
    }
    const leftEdge = MeshBuilder.CreateRibbon('leftEdge', {
      pathArray: [llL, llR],
      closePath: false,
      sideOrientation: 2,
    }, this.scene);
    const leMat = new StandardMaterial('leftEdgeMat', this.scene);
    leMat.diffuseColor    = new Color3(0.95, 0.95, 0.95);
    leMat.emissiveColor   = new Color3(0.18, 0.18, 0.18);
    leMat.backFaceCulling = false;
    leftEdge.material     = leMat;

    // ── Right white edge line ─────────────────────────────────────────────
    const rlL = [], rlR = [];
    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.20;
      rlL.push(new Vector3(p.x + perp.x*(half - 8), y, p.z + perp.z*(half - 8)));
      rlR.push(new Vector3(p.x + perp.x*(half - 4), y, p.z + perp.z*(half - 4)));
    }
    const rightEdge = MeshBuilder.CreateRibbon('rightEdge', {
      pathArray: [rlL, rlR],
      closePath: false,
      sideOrientation: 2,
    }, this.scene);
    const reMat = new StandardMaterial('rightEdgeMat', this.scene);
    reMat.diffuseColor    = new Color3(0.95, 0.95, 0.95);
    reMat.emissiveColor   = new Color3(0.18, 0.18, 0.18);
    reMat.backFaceCulling = false;
    rightEdge.material    = reMat;

    // ── Dirt verges both sides (brown) ────────────────────────────────────
    [
      { path: pathL, name: 'vergeL', dir: -1 },
      { path: pathR, name: 'vergeR', dir:  1 },
    ].forEach(({ path, name, dir }) => {
      const vIn  = [];
      const vOut = [];
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const perp = this._perp(i);
        const ox   = p.x + perp.x * dir * 12;
        const oz   = p.z + perp.z * dir * 12;
        vIn.push(new Vector3(p.x, p.y - 0.01, p.z));
        vOut.push(new Vector3(ox, 2.0, oz));
      }
      const verge = MeshBuilder.CreateRibbon(name, {
        pathArray: [vIn, vOut],
        closePath: false,
        sideOrientation: 2,
      }, this.scene);
      const vm = new StandardMaterial(name+'Mat', this.scene);
      vm.diffuseColor    = new Color3(0.45, 0.28, 0.10);
      vm.specularColor   = new Color3(0.02, 0.01, 0.01);
      vm.backFaceCulling = false;
      verge.material     = vm;
    });
  }
}