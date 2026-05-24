/**
 * LoadingScreen.js
 * Loading screen with progress bar.
 * Triggers the actual game init when shown.
 */

export class LoadingScreen {
  constructor(screenManager, initGameFn) {
    this._sm       = screenManager;
    this._initGame = initGameFn;
    this._el       = this._build();
  }

  getElement() { return this._el; }

  _build() {
    const el = document.createElement('div');
    el.className = 'cv-screen cv-loading';
    el.innerHTML = `
      <div class="loading-content">
        <div class="loading-flag">🇻🇨</div>
        <h2>Loading St. Vincent…</h2>
        <div class="loading-bar-track">
          <div class="loading-bar-fill" id="ld-fill"></div>
        </div>
        <div class="loading-status" id="ld-status">Initialising engine…</div>
      </div>
    `;
    return el;
  }

  setProgress(pct, message) {
    const fill   = this._el.querySelector('#ld-fill');
    const status = this._el.querySelector('#ld-status');
    if (fill)   fill.style.width = `${pct}%`;
    if (status) status.textContent = message;
  }

  async onShow(data) {
    // data = { vehicle: 'van' | 'civic' | 'fit' }
    const vehicle = (data && data.vehicle) || 'van';
    try {
      await this._initGame(vehicle, (pct, msg) => this.setProgress(pct, msg));
      // Game is ready — show HUD
      setTimeout(() => this._sm.show('hud'), 400);
    } catch (err) {
      console.error('Game init failed:', err);
      this.setProgress(100, `Error: ${err.message}`);
    }
  }

  onHide() {}
}
