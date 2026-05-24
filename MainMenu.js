/**
 * MainMenu.js
 * CariVan main menu — title, play, garage, settings.
 */

export class MainMenu {
  constructor(screenManager) {
    this._sm = screenManager;
    this._el = this._build();
  }

  getElement() { return this._el; }

  // ── Build DOM ─────────────────────────────────────────────────────────
  _build() {
    const el = document.createElement('div');
    el.className = 'cv-screen cv-main-menu';
    el.innerHTML = `
      <div class="mm-bg-overlay"></div>

      <div class="mm-content">
        <!-- Logo / Title -->
        <div class="mm-logo">
          <div class="mm-logo-tag">🇻🇨</div>
          <h1 class="mm-title">CariVan</h1>
          <p class="mm-subtitle">Drive St. Vincent</p>
        </div>

        <!-- Main Actions -->
        <div class="mm-actions">
          <button class="cv-btn cv-btn-primary" id="mm-play">
            <span class="btn-icon">▶</span> Play
          </button>
          <button class="cv-btn cv-btn-secondary" id="mm-garage">
            <span class="btn-icon">🚗</span> Garage
          </button>
          <button class="cv-btn cv-btn-secondary" id="mm-settings">
            <span class="btn-icon">⚙</span> Settings
          </button>
        </div>

        <!-- Version -->
        <div class="mm-footer">
          <span>CariVan v0.1 · St. Vincent &amp; the Grenadines</span>
        </div>
      </div>

      <!-- Settings panel (inline) -->
      <div class="mm-settings-panel" id="mm-settings-panel" style="display:none">
        <div class="panel-card">
          <h2>Settings</h2>
          <label class="cv-toggle-row">
            <span>Sound</span>
            <input type="checkbox" id="s-sound" checked>
            <span class="toggle-track"></span>
          </label>
          <label class="cv-toggle-row">
            <span>Shadows</span>
            <input type="checkbox" id="s-shadows" checked>
            <span class="toggle-track"></span>
          </label>
          <label class="cv-toggle-row">
            <span>Show FPS</span>
            <input type="checkbox" id="s-fps">
            <span class="toggle-track"></span>
          </label>
          <button class="cv-btn cv-btn-secondary" id="mm-settings-close">Close</button>
        </div>
      </div>
    `;

    // Wire buttons
    el.querySelector('#mm-play').onclick = () => {
      this._sm.show('loading');
    };

    el.querySelector('#mm-garage').onclick = () => {
      this._sm.show('garage');
    };

    el.querySelector('#mm-settings').onclick = () => {
      el.querySelector('#mm-settings-panel').style.display = 'flex';
    };

    el.querySelector('#mm-settings-close').onclick = () => {
      el.querySelector('#mm-settings-panel').style.display = 'none';
    };

    return el;
  }

  onShow() {}
  onHide() {}
}
