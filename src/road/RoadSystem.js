import { Vector3, MeshBuilder, StandardMaterial, Color3 }
  from '@babylonjs/core';

const WAYPOINTS = [
  [3200, -16000],
  [3250, -15500],
  [3300, -15000],
  [3400, -14500],
  [3500, -14000],
  [3650, -13500],
  [3800, -13000],
  [4000, -12500],
  [4150, -12000],
  [4300, -11500],
  [4450, -11000],
  [4580, -10500],
  [4700, -10000],
  [4800,  -9500],
  [4900,  -9000],
  [5050,  -8550],
  [5150,  -8000],
  [5200,  -7500],
  [5180,  -7000],
  [5100,  -6500],
  [5000,  -6000],
  [4880,  -5500],
  [4750,  -5000],
  [4620,  -4500],
  [4500,  -4000],
  [4400,  -3500],
  [4320,  -3000],
  [4280,  -2500],
  [4300,  -2000],
  [4380,  -1500],
];

export const ROAD_WIDTH    = 48;
export const ROAD_BOUNDARY = 22;
export const ROAD_EDGE     = 20;

export class RoadSystem {
  constructor(scene, terrain) {
    this.scene       = scene;
    this.terrain     = terrain;
    this.points      = this._buildSpline();
    this.points      = this._smoothY(this.points, 10);
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
    const raw   = WAYPOINTS.map(([x, z]) => ({ x, z }));
    const pts   = [];
    const N     = raw.length;
    const STEPS = 40;
    for (let i = 0; i < N - 1; i++) {
      const p0 = raw[Math.max(0, i - 1)];
      const p1 = raw[i];
      const p2 = raw[i + 1];
      const p3 = raw[Math.min(N - 1, i + 2)];
      for (let s = 0; s < STEPS; s++) {
        const t  = s / STEPS;
        const t2 = t*t, t3 = t2*t;
        const f  = (a,b,c,d) =>
          0.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
        const x = f(p0.x,p1.x,p2.x,p3.x);
        const z = f(p0.z,p1.z,p2.z,p3.z);
        pts.push(new Vector3(x, this._groundY(x,z), z));
      }
    }
    const last = raw[N-1];
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
      const mid = (lo+hi) >> 1;
      if (this.cumDist[mid+1] < d) lo = mid+1; else hi = mid;
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
    return { position: new Vector3(wx, pos.y + 0.65, wz), heading };
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
    const next = this.points[Math.min(i+1, this.points.length-1)];
    const prev = this.points[Math.max(i-1, 0)];
    const tang = next.subtract(prev).normalize();
    return new Vector3(tang.z, 0, -tang.x);
  }

  _buildRoadMesh() {
    const half   = ROAD_WIDTH / 2;
    const pathL  = [];
    const pathR  = [];

    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.10;
      pathL.push(new Vector3(p.x - perp.x*half, y, p.z - perp.z*half));
      pathR.push(new Vector3(p.x + perp.x*half, y, p.z + perp.z*half));
    }

    // ── Asphalt surface ───────────────────────────────────────────────────
    const road = MeshBuilder.CreateRibbon('road', {
      pathArray: [pathL, pathR],
      closePath: false, sideOrientation: 2,
    }, this.scene);
    const roadMat = new StandardMaterial('roadMat', this.scene);
    roadMat.diffuseColor    = new Color3(0.20, 0.20, 0.20);
    roadMat.specularColor   = new Color3(0.06, 0.06, 0.06);
    roadMat.backFaceCulling = false;
    road.material = roadMat;

    // ── Lane divider — solid yellow centre line ───────────────────────────
    const centreL = [];
    const centreR = [];
    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const perp = this._perp(i);
      const y    = p.y + 0.22;
      const hw   = 0.9; // half-width of centre stripe
      centreL.push(new Vector3(p.x - perp.x*hw, y, p.z - perp.z*hw));
      centreR.push(new Vector3(p.x + perp.x*hw, y, p.z + perp.z*hw));
    }
    const centre = MeshBuilder.CreateRibbon('centre', {
      pathArray: [centreL, centreR],
      closePath: false, sideOrientation: 2,
    }, this.scene);
    const cMat = new StandardMaterial('centreMat', this.scene);
    cMat.diffuseColor    = new Color3(1.0, 0.85, 0.0);
    cMat.emissiveColor   = new Color3(0.35, 0.28, 0.0);
    cMat.backFaceCulling = false;
    centre.material = cMat;

    // ── White edge lines — ribbons flush to road edges ────────────────────
    [pathL, pathR].forEach((path, s) => {
      const eL = [], eR = [];
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const perp = this._perp(i);
        const dir  = s === 0 ? -1 : 1;
        const y    = p.y + 0.18;
        const hw   = 0.5;
        eL.push(new Vector3(p.x + perp.x*dir*hw, y, p.z + perp.z*dir*hw));
        eR.push(new Vector3(p.x - perp.x*dir*hw, y, p.z - perp.z*dir*hw));
      }
      const edge = MeshBuilder.CreateRibbon('edge'+s, {
        pathArray: [eL, eR],
        closePath: false, sideOrientation: 2,
      }, this.scene);
      const em = new StandardMaterial('edgeMat'+s, this.scene);
      em.diffuseColor    = new Color3(0.95, 0.95, 0.95);
      em.emissiveColor   = new Color3(0.20, 0.20, 0.20);
      em.backFaceCulling = false;
      edge.material = em;
    });

    // ── Lane break dashes — right lane guide ─────────────────────────────
    const laneOffset = ROAD_WIDTH * 0.25; // quarter width from centre
    for (let i = 0; i < this.points.length - 10; i += 14) {
      const a    = this.points[i];
      const b    = this.points[Math.min(i+6, this.points.length-1)];
      const mid  = Vector3.Lerp(a, b, 0.5);
      const tang = b.subtract(a).normalize();
      const perp = new Vector3(tang.z, 0, -tang.x);
      const len  = Vector3.Distance(a, b);

      [-1, 1].forEach(side => {
        const dx = mid.x + perp.x * side * laneOffset;
        const dz = mid.z + perp.z * side * laneOffset;
        const dy = mid.y + 0.20;
        const dash = MeshBuilder.CreateBox('dash'+side+'_'+i, {
          width: 0.5, height: 0.05, depth: len * 0.45
        }, this.scene);
        dash.position.set(dx, dy, dz);
        dash.rotation.y = Math.atan2(tang.x, tang.z);
        const dm = new StandardMaterial('dashMat'+side+'_'+i, this.scene);
        dm.diffuseColor  = new Color3(0.90, 0.90, 0.90);
        dm.emissiveColor = new Color3(0.15, 0.15, 0.15);
        dash.material = dm;
      });
    }

    // ── Grass verges — natural colour, no neon ────────────────────────────
    [
      { path: pathL, name: 'vergeL', dir: -1 },
      { path: pathR, name: 'vergeR', dir:  1 },
    ].forEach(({ path, name, dir }) => {
      const vIn = [], vOut = [];
      const vergeW = 16;
      for (let i = 0; i < path.length; i++) {
        const p    = path[i];
        const perp = this._perp(i);
        const ox   = p.x + perp.x * dir * vergeW;
        const oz   = p.z + perp.z * dir * vergeW;
        const oy   = this._groundY(ox, oz) + 0.05;
        vIn.push(new Vector3(p.x, p.y - 0.01, p.z));
        vOut.push(new Vector3(ox, oy, oz));
      }
      const verge = MeshBuilder.CreateRibbon(name, {
        pathArray: [vIn, vOut],
        closePath: false, sideOrientation: 2,
      }, this.scene);
      const vm = new StandardMaterial(name+'Mat', this.scene);
      vm.diffuseColor    = new Color3(0.26, 0.46, 0.16);
      vm.specularColor   = new Color3(0.01, 0.02, 0.01);
      vm.backFaceCulling = false;
      verge.material = vm;
    });
  }
}