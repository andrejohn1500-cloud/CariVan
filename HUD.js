/**
 * HUD.js
 * In-game heads-up display.
 *
 * Features:
 *  - Speedometer (km/h analogue arc + digital readout)
 *  - Minimap (canvas-based, draws road network + van position)
 *  - On-screen joystick (mobile)
 *  - Horn button
 *  - Gear indicator (D / R)
 *  - Pause button
 */

import { SVG_ROADS, geoToWorld } from '../map/OSMFetcher.js';

export class HUD {
  constructor(screenManager, getVanFn) {
    this._sm     = screenManager;
    this._getVan = getVanFn;   // () => VanController instance
    this._el     = this._build();
    this._joystickActive = false;
    this._joystickOrigin = { x: 0, y: 0 };
    this._minimapCtx     = null;
    this._rafId          = null;
    this._setupJoystick();
  }

  getElement() { return this._el; }

  // ── Build HUD DOM ─────────────────────────────────────────────────────
  _build() {
    const el = document.createElement('div');
    el.className = 'cv-screen cv-hud';
    el.innerHTML = `
      <!-- Top bar -->
      <div class="hud-topbar">
        <button class="cv-btn-icon hud-pause" id="hud-pause">⏸</button>
        <div class="hud-location" id="hud-location">St. Vincent</div>
        <div class="hud-clock" id="hud-clock">12:00</div>
      </div>

      <!-- Minimap (top-right) -->
      <div class="hud-minimap-wrap">
        <canvas class="hud-minimap" id="hud-minimap" width="180" height="180"></canvas>
        <div class="minimap-label">SVG</div>
      </div>

      <!-- Speedometer (bottom-left) -->
      <div class="hud-speedo-wrap">
        <canvas class="hud-speedo-canvas" id="hud-speedo" width="160" height="100"></canvas>
        <div class="hud-speedo-digital">
          <span class="speedo-kmh" id="hud-speed">0</span>
          <span class="speedo-unit">km/h</span>
        </div>
        <div class="hud-gear" id="hud-gear">D</div>
      </div>

      <!-- Mobile joystick zone (bottom-centre) -->
      <div class="hud-joystick-zone" id="hud-joystick-zone">
        <div class="hud-joystick-ring">
          <div class="hud-joystick-thumb" id="hud-joystick-thumb"></div>
        </div>
      </div>

      <!-- Horn + action buttons (bottom-right) -->
      <div class="hud-action-btns">
        <button class="cv-btn-action hud-horn" id="hud-horn">📯</button>
        <button class="cv-btn-action hud-look" id="hud-look">👁</button>
      </div>
    `;

    el.querySelector('#hud-pause').onclick = () => {
      this._sm.show('pause');
      this._stop();
    };

    el.querySelector('#hud-horn').onclick = () => {
      const van = this._getVan();
      if (van && van.honk) van.honk();
    };

    return el;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────
  onShow() {
    this._initMinimap();
    this._start();
  }

  onHide() {
    this._stop();
  }

  _start() {
    this._stop();
    const tick = () => {
      this._updateSpeedo();
      this._updateMinimap();
      this._updateClock();
      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  _stop() {
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  // ── Speedometer arc ───────────────────────────────────────────────────
  _updateSpeedo() {
    const van = this._getVan();
    if (!van) return;
    const speed = van.getSpeed ? van.getSpeed() : 0;
    const gear  = van.speed >= 0 ? 'D' : 'R';

    this._el.querySelector('#hud-speed').textContent = speed;
    this._el.querySelector('#hud-gear').textContent  = gear;

    const canvas = this._el.querySelector('#hud-speedo');
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Arc background
    const cx = W / 2, cy = H - 8, r = 72;
    const startA = Math.PI, endA = 2 * Math.PI;

    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 10;
    ctx.stroke();

    // Speed arc
    const pct   = Math.min(speed / 140, 1);
    const fillA = startA + pct * Math.PI;
    const color = pct < 0.6 ? '#4CAF72' : pct < 0.85 ? '#FFA500' : '#E74C3C';

    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, fillA);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 10;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // Tick marks
    for (let i = 0; i <= 7; i++) {
      const a  = Math.PI + (i / 7) * Math.PI;
      const r1 = r - 14, r2 = r - 4;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
      ctx.lineTo(cx + r2 * Math.cos(a), cy + r2 * Math.sin(a));
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }
  }

  // ── Minimap ───────────────────────────────────────────────────────────
  _initMinimap() {
    const canvas = this._el.querySelector('#hud-minimap');
    this._minimapCtx = canvas.getContext('2d');
    this._drawMinimapBase();
  }

  _drawMinimapBase() {
    const ctx = this._minimapCtx;
    if (!ctx) return;
    const W = 180, H = 180;

    // Ocean background
    ctx.fillStyle = '#0e4a6e';
    ctx.fillRect(0, 0, W, H);

    // Island silhouette (simple SVG shape approximation)
    ctx.fillStyle = '#2d5a20';
    ctx.beginPath();
    ctx.ellipse(90, 100, 42, 72, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Roads from OSMFetcher data
    const WORLD_W = 29000, WORLD_H = 45000;
    const toMM = (wx, wz) => ({
      x: ((wx + WORLD_W / 2) / WORLD_W) * W,
      y: H - ((wz + WORLD_H / 2) / WORLD_H) * H
    });

    ctx.strokeStyle = '#888';
    ctx.lineWidth   = 1;

    Object.values(SVG_ROADS).forEach(road => {
      if (!road.points || road.points.length < 2) return;
      ctx.beginPath();
      road.points.forEach(([lat, lon], i) => {
        const { x, z } = geoToWorld(lat, lon);
        const mm = toMM(x, z);
        i === 0 ? ctx.moveTo(mm.x, mm.y) : ctx.lineTo(mm.x, mm.y);
      });
      ctx.stroke();
    });

    // Kingstown marker
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    const ktown = geoToWorld(13.160, -61.225);
    const km = toMM(ktown.x, ktown.z);
    ctx.arc(km.x, km.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Argyle marker
    ctx.fillStyle = '#4FC3F7';
    ctx.beginPath();
    const arg = geoToWorld(13.1567, -61.1499);
    const am = toMM(arg.x, arg.z);
    ctx.arc(am.x, am.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Minimap border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(0, 0, W, H);

    // Save base image for van dot overlay
    this._minimapBase = ctx.getImageData(0, 0, W, H);
  }

  _updateMinimap() {
    const ctx = this._minimapCtx;
    if (!ctx || !this._minimapBase) return;
    const van = this._getVan();
    if (!van) return;

    const W = 180, H = 180;
    const WORLD_W = 29000, WORLD_H = 45000;

    // Restore base
    ctx.putImageData(this._minimapBase, 0, 0);

    // Van dot
    const vx = ((van.root.position.x + WORLD_W / 2) / WORLD_W) * W;
    const vy = H - ((van.root.position.z + WORLD_H / 2) / WORLD_H) * H;

    // Van direction arrow
    const angle = van.root.rotation.y;
    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(-angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Pulsing ring
    const t = (Date.now() % 1200) / 1200;
    ctx.beginPath();
    ctx.arc(vx, vy, 5 + t * 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.6 - t * 0.6})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // ── Clock ─────────────────────────────────────────────────────────────
  _updateClock() {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    const el  = this._el.querySelector('#hud-clock');
    if (el) el.textContent = `${h}:${m}`;
  }

  // ── Touch joystick ────────────────────────────────────────────────────
  _setupJoystick() {
    const zone  = this._el.querySelector('#hud-joystick-zone');
    const thumb = this._el.querySelector('#hud-joystick-thumb');
    const MAX   = 45;

    const move = (clientX, clientY) => {
      const rect = zone.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > MAX) { dx = dx / dist * MAX; dy = dy / dist * MAX; }

      thumb.style.transform = `translate(${dx}px, ${dy}px)`;

      const nx = dx / MAX;
      const ny = dy / MAX;

      const van = this._getVan();
      if (van && van.setJoystick) van.setJoystick(nx, ny);
      if (window.touchInput) { window.touchInput.x = nx; window.touchInput.y = ny; }
    };

    const reset = () => {
      thumb.style.transform = 'translate(0,0)';
      const van = this._getVan();
      if (van && van.setJoystick) van.setJoystick(0, 0);
      if (window.touchInput) { window.touchInput.x = 0; window.touchInput.y = 0; }
      this._joystickActive = false;
    };

    zone.addEventListener('touchstart', e => {
      e.preventDefault();
      this._joystickActive = true;
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', e => {
      e.preventDefault();
      if (this._joystickActive) move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    zone.addEventListener('touchend',   reset);
    zone.addEventListener('touchcancel', reset);
  }

  onShow() { this._initMinimap(); this._start(); }
  onHide() { this._stop(); }
}
