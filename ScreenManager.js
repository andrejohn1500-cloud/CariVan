/**
 * ScreenManager.js
 * Central controller for all UI screens in CariVan.
 * Screens are HTML overlays on top of the BabylonJS canvas.
 *
 * Usage:
 *   import { ScreenManager } from './ui/ScreenManager.js';
 *   const sm = new ScreenManager();
 *   sm.show('mainMenu');
 */

export class ScreenManager {
  constructor() {
    this._screens = {};
    this._active  = null;
    this._root    = this._buildRoot();
  }

  // ── Build the overlay root ────────────────────────────────────────────
  _buildRoot() {
    let root = document.getElementById('sm-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'sm-root';
      root.style.cssText = `
        position:fixed; inset:0; pointer-events:none; z-index:100;
        font-family:'Segoe UI',system-ui,sans-serif;
      `;
      document.body.appendChild(root);
    }
    return root;
  }

  // ── Register a screen ─────────────────────────────────────────────────
  register(name, screen) {
    this._screens[name] = screen;
    const el = screen.getElement();
    el.style.cssText += `
      position:absolute; inset:0;
      opacity:0; pointer-events:none;
      transition:opacity 0.35s ease;
    `;
    el.dataset.screen = name;
    this._root.appendChild(el);
  }

  // ── Show a screen (hides current) ────────────────────────────────────
  show(name, data) {
    if (this._active) {
      const prev = this._screens[this._active];
      if (prev) {
        const el = prev.getElement();
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        if (prev.onHide) prev.onHide();
      }
    }

    const next = this._screens[name];
    if (!next) {
      console.warn(`ScreenManager: unknown screen "${name}"`);
      return;
    }

    this._active = name;
    const el = next.getElement();
    el.style.pointerEvents = 'all';

    // Slight delay so transition fires
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      if (next.onShow) next.onShow(data);
    });
  }

  // ── Hide all screens (game running, no UI) ────────────────────────────
  hideAll() {
    Object.values(this._screens).forEach(s => {
      const el = s.getElement();
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      if (s.onHide) s.onHide();
    });
    this._active = null;
  }

  // ── Get a registered screen instance ─────────────────────────────────
  get(name) {
    return this._screens[name] || null;
  }
}
