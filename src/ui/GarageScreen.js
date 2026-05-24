/**
 * GarageScreen.js
 * Vehicle selection screen — pick your ride, see stats, upgrades.
 *
 * Exposes: GarageScreen.selectedVehicle ('van' | 'civic' | 'fit')
 */

export const VEHICLES = {
  van: {
    id: 'van',
    name: 'HiAce Urvan',
    subtitle: 'Vincy Minibus',
    emoji: '🚐',
    color: '#ECECE8',
    accent: '#4CAF72',
    plate: 'H-1234',
    stats: {
      speed:    { label: 'Top Speed',     value: 80,  max: 180 },
      accel:    { label: 'Acceleration',  value: 45,  max: 100 },
      handling: { label: 'Handling',      value: 55,  max: 100 },
      braking:  { label: 'Braking',       value: 60,  max: 100 },
    },
    description: 'The heartbeat of Vincy transport. Loud horn, full load, always late — but always arrives.'
  },
  civic: {
    id: 'civic',
    name: '2008 Honda Civic FD',
    subtitle: 'JDM Edition · PX842',
    emoji: '🚗',
    color: '#0d0d0d',
    accent: '#c8a800',
    plate: 'PX842',
    stats: {
      speed:    { label: 'Top Speed',     value: 145, max: 180 },
      accel:    { label: 'Acceleration',  value: 72,  max: 100 },
      handling: { label: 'Handling',      value: 80,  max: 100 },
      braking:  { label: 'Braking',       value: 75,  max: 100 },
    },
    description: 'Jet black, yellow JDM rims, twin exhaust. Built for Vincy roads and weekend flex.'
  },
  fit: {
    id: 'fit',
    name: '2019 Honda Fit Hybrid',
    subtitle: 'Pearl Silver · PAB699',
    emoji: '🚙',
    color: '#d2dde3',
    accent: '#1a6fac',
    plate: 'PAB699',
    stats: {
      speed:    { label: 'Top Speed',     value: 120, max: 180 },
      accel:    { label: 'Acceleration',  value: 68,  max: 100 },
      handling: { label: 'Handling',      value: 88,  max: 100 },
      braking:  { label: 'Braking',       value: 82,  max: 100 },
    },
    description: 'Wifey\'s car. Fuel-sipping hybrid with surprisingly sharp handling. Touch it and die.'
  }
};

export class GarageScreen {
  constructor(screenManager) {
    this._sm       = screenManager;
    this._selected = 'van';
    this._el       = this._build();
    this._render();
  }

  get selectedVehicle() { return this._selected; }
  getElement() { return this._el; }

  // ── Build shell DOM ───────────────────────────────────────────────────
  _build() {
    const el = document.createElement('div');
    el.className = 'cv-screen cv-garage';
    el.innerHTML = `
      <div class="garage-header">
        <button class="cv-btn-icon" id="g-back">←</button>
        <h2>Garage</h2>
        <div style="width:40px"></div>
      </div>

      <!-- Vehicle selector tabs -->
      <div class="garage-tabs" id="g-tabs"></div>

      <!-- Vehicle showcase -->
      <div class="garage-showcase" id="g-showcase"></div>

      <!-- Stats panel -->
      <div class="garage-stats" id="g-stats"></div>

      <!-- Action -->
      <div class="garage-footer">
        <button class="cv-btn cv-btn-primary full-width" id="g-select">
          Drive This
        </button>
      </div>
    `;

    el.querySelector('#g-back').onclick = () => this._sm.show('mainMenu');
    el.querySelector('#g-select').onclick = () => this._sm.show('loading', { vehicle: this._selected });

    return el;
  }

  // ── Render current selection ──────────────────────────────────────────
  _render() {
    this._renderTabs();
    this._renderShowcase();
    this._renderStats();
  }

  _renderTabs() {
    const tabs = this._el.querySelector('#g-tabs');
    tabs.innerHTML = Object.values(VEHICLES).map(v => `
      <button class="g-tab ${v.id === this._selected ? 'active' : ''}"
              data-id="${v.id}">
        ${v.emoji}
        <span>${v.name.split(' ').slice(-1)[0]}</span>
      </button>
    `).join('');

    tabs.querySelectorAll('.g-tab').forEach(btn => {
      btn.onclick = () => {
        this._selected = btn.dataset.id;
        this._render();
      };
    });
  }

  _renderShowcase() {
    const v  = VEHICLES[this._selected];
    const el = this._el.querySelector('#g-showcase');
    el.innerHTML = `
      <div class="showcase-card" style="
        background: linear-gradient(135deg, ${v.color}22, ${v.accent}33);
        border: 1px solid ${v.accent}55;
      ">
        <div class="showcase-emoji">${v.emoji}</div>
        <div class="showcase-plate"
             style="background:${v.accent};color:${v.id==='civic'?'#000':'#fff'}">
          ${v.plate}
        </div>
        <div class="showcase-name">${v.name}</div>
        <div class="showcase-sub">${v.subtitle}</div>
        <div class="showcase-desc">${v.description}</div>
      </div>
    `;
  }

  _renderStats() {
    const v   = VEHICLES[this._selected];
    const el  = this._el.querySelector('#g-stats');
    const rows = Object.values(v.stats).map(s => `
      <div class="stat-row">
        <span class="stat-label">${s.label}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill"
               style="width:${(s.value/s.max*100).toFixed(1)}%;
                      background:${VEHICLES[this._selected].accent}">
          </div>
        </div>
        <span class="stat-val">${s.value}</span>
      </div>
    `).join('');
    el.innerHTML = `<div class="stats-grid">${rows}</div>`;
  }

  onShow() { this._render(); }
  onHide() {}
}
