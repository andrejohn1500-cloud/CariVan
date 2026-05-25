import { Vector3, MeshBuilder, StandardMaterial, Color3 }
  from '@babylonjs/core';

// SVG West Coast — Leeward Highway
// Caribbean Sea to the west (negative X), mountains to the east (positive X)
const WAYPOINTS = [
  [3200, -14500], // North tip near Chateaubelair coast
  [3400, -14000],
  [3700, -13500],
  [4000, -13000],
  [4300, -12500],
  [4550, -12000],
  [4700, -11500],
  [4820, -11000],
  [4900, -10500],
  [4980, -10000],
  [5050,  -9500],
  [5278,  -8550], // Kingstown spawn
  [5350,  -8000],
  [5320,  -7500],
  [5250,  -7000],
  [5150,  -6500],
  [5020,  -6000],
  [4880,  -5500],
  [4720,  -5000],
  [4580,  -4500],
  [4450,  -4000],
  [4350,  -3500], // South approaching Calliaqua
];

export const ROAD_WIDTH    = 20;
export const ROAD_BOUNDARY = 10;
export const ROAD_EDGE     = 9;

export class RoadSystem {
  constructor(scene, terrain) {
    this.scene       = scene;
    this.terrain     = terrain;
    this.points      = this._buildSpline();
    this.cumDist     = this._calcCumDist();
    this.totalLength = this.cumDist[this.cumDist.length - 1];
    this._buildRoadMesh();
  }

  _groundY(x, z) {
    try {
      const h = this.terrain?.getHeightAtCoordinates?.(x, z);
      return (h == null || isNaN(h)) ? 0 : h;
    } catch { return 0; }
  }

  _buildSpline() {
    // XZ spline only — Y sampled per point directly from terrain
    const raw = WAYPOINTS.map(([x, z]) => ({ x, z }));
    const pts = [];
    const N   = raw.length;
    const STEPS = 30;

    for (let i = 0; i < N - 1; i++) {
      const p0 = raw[Math.max(0, i - 1)];
      const p1 = raw[i];
      const p2 = raw[i + 1];
      const p3 = raw[Math.min(N - 1, i + 2)];

      for (let s = 0; s < STEPS; s++) {
        const t  = s / STEPS;
        const t2 = t * t;
        const t3 = t2 * t;
        const f  = (a, b, c, d) =>
          0.5 * (2*b + (-a+c)*t + (2*a-5*b+4*c-d)*t2 + (-a+3*b-3*c+d)*t3);
        const x = f(p0.x, p1.x, p2.x, p3.x);
        const z = f(p0.z, p1.z, p2.z, p3.z);
        // Y from terrain only — never spline-interpolated
        const y = this._groundY(x, z);
        pts.push(new Vector3(x, y, z));
      }
    }

    const last = raw[N - 1];
    pts.push(new Vector3(last.x, this._groundY(last.x, last.z), last.z));
    return pts;
  }

  _calcCumDist() {
    const c = [0];
    for (let i = 1; i < this.points.length; i++)
      c.push(c[i-1] + Vector3.Distance(this.points[i], this.points[i-1]));
    return c;
  }

  getAtDist(d) {
    d = Math.max(0, Math.min(d, this.totalLength - 0.01));
    let lo = 0, hi = this.cumDist.length - 2;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cumDist[mid+1] < d) lo = mid + 1;
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
    const wy   = this._groundY(wx, wz) + 0.6;
    return { position: new Vector3(wx, wy, wz), heading };
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

  _buildRoadMesh() {
    const half  = ROAD_WIDTH / 2;
    const pathL = [];
    const pathR = [];

    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const next = this.points[Math.min(i + 1, this.points.length - 1)];
      const prev = this.points[Math.max(i - 1, 0)];
      const tang = next.subtract(prev).normalize();
      const perp = new Vector3(tang.z, 0, -tang.x);

      const lx = p.x - perp.x * half;
      const lz = p.z - perp.z * half;
      const rx = p.x + perp.x * half;
      const rz = p.z + perp.z * half;

      // Each edge vertex Y sampled from terrain independently
      pathL.push(new Vector3(lx, this._groundY(lx, lz) + 0.12, lz));
      pathR.push(new Vector3(rx, this._groundY(rx, rz) + 0.12, rz));
    }

    // Asphalt ribbon
    const road = MeshBuilder.CreateRibbon('road', {
      pathArray:       [pathL, pathR],
      closePath:       false,
      sideOrientation: 2,
    }, this.scene);
    const roadMat = new StandardMaterial('roadMat', this.scene);
    roadMat.diffuseColor    = new Color3(0.18, 0.18, 0.18);
    roadMat.specularColor   = new Color3(0.04, 0.04, 0.04);
    roadMat.backFaceCulling = false;
    road.material = roadMat;

    // Yellow centre dashes
    for (let i = 0; i < this.points.length - 8; i += 12) {
      const a    = this.points[i];
      const b    = this.points[i + 6];
      const mid  = Vector3.Lerp(a, b, 0.5);
      const tang = b.subtract(a).normalize();
      const len  = Vector3.Distance(a, b);
      const y    = this._groundY(mid.x, mid.z) + 0.28;

      const dash = MeshBuilder.CreateBox('ld' + i, {
        width: 0.5, height: 0.05, depth: len * 0.55
      }, this.scene);
      dash.position.set(mid.x, y, mid.z);
      dash.rotation.y = Math.atan2(tang.x, tang.z);

      const lm = new StandardMaterial('ldm' + i, this.scene);
      lm.diffuseColor  = new Color3(1, 0.88, 0);
      lm.emissiveColor = new Color3(0.4, 0.34, 0);
      dash.material = lm;
    }

    // White edge lines — both sides
    [pathL, pathR].forEach((path, s) => {
      for (let i = 0; i < path.length - 4; i += 8) {
        const a    = path[i];
        const b    = path[Math.min(i + 4, path.length - 1)];
        const mid  = Vector3.Lerp(a, b, 0.5);
        const tang = b.subtract(a).normalize();
        const len  = Vector3.Distance(a, b);

        const el = MeshBuilder.CreateBox('el' + s + '_' + i, {
          width: 0.25, height: 0.05, depth: len
        }, this.scene);
        el.position.set(mid.x, mid.y + 0.06, mid.z);
        el.rotation.y = Math.atan2(tang.x, tang.z);

        const em = new StandardMaterial('elm' + s + '_' + i, this.scene);
        em.diffuseColor  = new Color3(1, 1, 1);
        em.emissiveColor = new Color3(0.3, 0.3, 0.3);
        el.material = em;
      }
    });

    // Grass verge either side — subtle green strip
    [
      { path: pathL, name: 'vergeL', offset: -4 },
      { path: pathR, name: 'vergeR', offset:  4 },
    ].forEach(({ path, name, offset }) => {
      const vPathL = [];
      const vPathR = [];
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const next = path[Math.min(i + 1, path.length - 1)];
        const prev = path[Math.max(i - 1, 0)];
        const tang = next.subtract(prev).normalize();
        const perp = new Vector3(tang.z, 0, -tang.x);
        const ox   = p.x + perp.x * offset;
        const oz   = p.z + perp.z * offset;
        const oy   = this._groundY(ox, oz) + 0.05;
        vPathL.push(new Vector3(p.x, p.y - 0.02, p.z));
        vPathR.push(new Vector3(ox, oy, oz));
      }
      const verge = MeshBuilder.CreateRibbon(name, {
        pathArray: [vPathL, vPathR],
        closePath: false, sideOrientation: 2,
      }, this.scene);
      const vm = new StandardMaterial(name + 'Mat', this.scene);
      vm.diffuseColor    = new Color3(0.22, 0.52, 0.14);
      vm.specularColor   = new Color3(0.02, 0.04, 0.01);
      vm.backFaceCulling = false;
      verge.material = vm;
    });
  }
}