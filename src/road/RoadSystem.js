import { Vector3, MeshBuilder, StandardMaterial, Color3 }
  from '@babylonjs/core';

// Leeward Highway through Kingstown, SVG world coords
const WAYPOINTS = [
  [5278, -11500],
  [5300, -11000],
  [5350, -10500],
  [5320, -10000],
  [5290,  -9500],
  [5278,  -8550], // spawn
  [5250,  -8000],
  [5200,  -7500],
  [5150,  -7000],
  [5100,  -6500],
  [5050,  -6000],
];

export const ROAD_WIDTH    = 12;
export const ROAD_BOUNDARY = 6;
export const ROAD_EDGE     = 5.5;

export class RoadSystem {
  constructor(scene, terrain) {
    this.scene   = scene;
    this.terrain = terrain;
    this.points  = this._buildSpline();
    this.cumDist = this._calcCumDist();
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
    const raw = WAYPOINTS.map(([x, z]) =>
      new Vector3(x, this._groundY(x, z), z));
    const pts = [];
    const N = raw.length;
    const STEPS = 30;
    for (let i = 0; i < N - 1; i++) {
      const p0 = raw[Math.max(0, i - 1)];
      const p1 = raw[i];
      const p2 = raw[i + 1];
      const p3 = raw[Math.min(N - 1, i + 2)];
      for (let s = 0; s < STEPS; s++)
        pts.push(this._cr(p0, p1, p2, p3, s / STEPS));
    }
    pts.push(raw[N - 1]);
    return pts;
  }

  _cr(p0, p1, p2, p3, t) {
    const t2 = t*t, t3 = t2*t;
    const f = (a,b,c,d) =>
      0.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
    return new Vector3(
      f(p0.x,p1.x,p2.x,p3.x),
      f(p0.y,p1.y,p2.y,p3.y),
      f(p0.z,p1.z,p2.z,p3.z));
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
      if (this.cumDist[mid+1] < d) lo = mid+1; else hi = mid;
    }
    const t = (d - this.cumDist[lo]) /
              (this.cumDist[lo+1] - this.cumDist[lo] + 0.0001);
    const pos  = Vector3.Lerp(this.points[lo], this.points[lo+1], t);
    const tang = this.points[lo+1].subtract(this.points[lo]).normalize();
    return { pos, tang, heading: Math.atan2(tang.x, tang.z) };
  }

  getCarTransform(d, lateral) {
    const { pos, tang, heading } = this.getAtDist(d);
    const perp = new Vector3(tang.z, 0, -tang.x);
    const wx = pos.x + perp.x * lateral;
    const wz = pos.z + perp.z * lateral;
    const wy = Math.max(this._groundY(wx, wz), pos.y) + 0.52;
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
    const half = ROAD_WIDTH / 2;
    const pathL = [], pathR = [];
    for (let i = 0; i < this.points.length; i++) {
      const p    = this.points[i];
      const next = this.points[Math.min(i+1, this.points.length-1)];
      const prev = this.points[Math.max(i-1, 0)];
      const tang = next.subtract(prev).normalize();
      const perp = new Vector3(tang.z, 0, -tang.x);
      const y    = Math.max(this._groundY(p.x, p.z), p.y) + 0.08;
      pathL.push(new Vector3(p.x - perp.x*half, y, p.z - perp.z*half));
      pathR.push(new Vector3(p.x + perp.x*half, y, p.z + perp.z*half));
    }
    const road = MeshBuilder.CreateRibbon('road', {
      pathArray: [pathL, pathR],
      closePath: false, sideOrientation: 2,
    }, this.scene);
    const mat = new StandardMaterial('roadMat', this.scene);
    mat.diffuseColor  = new Color3(0.18, 0.18, 0.18);
    mat.specularColor = new Color3(0.03, 0.03, 0.03);
    road.material = mat;

    // Yellow centre dashes
    for (let i = 0; i < this.points.length - 8; i += 12) {
      const a = this.points[i], b = this.points[i+6];
      const mid  = Vector3.Lerp(a, b, 0.5);
      const tang = b.subtract(a).normalize();
      const len  = Vector3.Distance(a, b);
      const y    = Math.max(this._groundY(mid.x, mid.z), mid.y) + 0.18;
      const dash = MeshBuilder.CreateBox('ld'+i,
        { width:0.35, height:0.05, depth:len*0.6 }, this.scene);
      dash.position.set(mid.x, y, mid.z);
      dash.rotation.y = Math.atan2(tang.x, tang.z);
      const lm = new StandardMaterial('ldm'+i, this.scene);
      lm.diffuseColor  = new Color3(1, 0.9, 0);
      lm.emissiveColor = new Color3(0.4, 0.35, 0);
      dash.material = lm;
    }

    // White edge lines
    [pathL, pathR].forEach((path, s) => {
      for (let i = 0; i < path.length - 4; i += 8) {
        const a = path[i], b = path[Math.min(i+4, path.length-1)];
        const mid  = Vector3.Lerp(a, b, 0.5);
        const tang = b.subtract(a).normalize();
        const len  = Vector3.Distance(a, b);
        const el   = MeshBuilder.CreateBox('el'+s+'_'+i,
          { width:0.2, height:0.05, depth:len }, this.scene);
        el.position.set(mid.x, mid.y+0.05, mid.z);
        el.rotation.y = Math.atan2(tang.x, tang.z);
        const em = new StandardMaterial('elm'+s+'_'+i, this.scene);
        em.diffuseColor  = new Color3(1, 1, 1);
        em.emissiveColor = new Color3(0.3, 0.3, 0.3);
        el.material = em;
      }
    });
  }
}
