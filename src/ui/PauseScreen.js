/**
 * PauseScreen.js
 * Pause overlay — resume, garage, quit to main menu.
 */

export class PauseScreen {
  constructor(screenManager) {
    this._sm = screenManager;
    this._el = this._build();
  }

  getElement() { return this._el; }

  _build() {
    const el = document.createElement('div');
    el.className = 'cv-screen cv-pause';
    el.innerHTML = `
      <div class="pause-backdrop"></div>
      <div class="pause-card">
        <div class="pause-icon">⏸</div>
        <h2>Paused</h2>

        <div class="pause-actions">
          <button class="cv-btn cv-btn-primary full-width" id="p-resume">
            ▶ Resume
          </button>
          <button class="cv-btn cv-btn-secondary full-width" id="p-garage">
            🚗 Change Vehicle
          </button>
          <button class="cv-btn cv-btn-ghost full-width" id="p-quit">
            ← Main Menu
          </button>
        </div>

        <div class="pause-tips" id="pause-tip"></div>
      </div>
    `;

    el.querySelector('#p-resume').onclick = () => {
      this._sm.show('hud');
    };

    el.querySelector('#p-garage').onclick = () => {
      this._sm.show('garage');
    };

    el.querySelector('#p-quit').onclick = () => {
      this._sm.show('mainMenu');
    };

    return el;
  }

  onShow() {
    const tips = [
      '🌊 The Caribbean Sea surrounds the island.',
      '🛬 Argyle International Airport is on the windward side.',
      '🏔 La Soufrière volcano rises 1,234m in the north.',
      '🚐 Vincy buses never stop blowing their horns.',
      '🏝 SVG has 32 islands and cays.',
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)];
    const el  = this._el.querySelector('#pause-tip');
    if (el) el.textContent = tip;
  }

  onHide() {}
}
