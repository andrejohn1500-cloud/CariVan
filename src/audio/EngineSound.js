// EngineSound.js — Procedural engine + horn audio via Web Audio API
// Vehicle-specific synthesis — no audio files needed

export class EngineSound {
  constructor(vehicleType = 'car') {
    this._ctx        = null;
    this._gainNode   = null;
    this._osc1       = null;
    this._osc2       = null;
    this._noiseGain  = null;
    this._running    = false;
    this._speed      = 0;
    this._targetRpm  = 800;
    this._currentRpm = 800;
    this._vehicle    = vehicleType;
    this._hornActive = false;
    this._profile_cache = null;

    // Pause sound when app goes background
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this._suspend();
      else this._resume();
    });
  }

  _profile() {
    switch (this._vehicle) {

      case 'van':
        return {
          osc1Type: 'sawtooth', osc2Type: 'square',
          idleFreq: 44, freqRange: 130,
          idleVol: 0.14, volRange: 0.28,
          noiseAmt: 0.07, filterFreq: 300,
          rpmIdle: 700, rpmMax: 3200,
          hornFreqs: [330, 415],
          hornType: 'sawtooth', hornVol: 0.6,
        };

      case 'truck':
        return {
          osc1Type: 'sawtooth', osc2Type: 'sawtooth',
          idleFreq: 32, freqRange: 100,
          idleVol: 0.18, volRange: 0.30,
          noiseAmt: 0.10, filterFreq: 250,
          rpmIdle: 600, rpmMax: 2800,
          hornFreqs: [220, 275],
          hornType: 'sawtooth', hornVol: 0.8,
        };

      case 'plane':
        return {
          osc1Type: 'square', osc2Type: 'sawtooth',
          idleFreq: 180, freqRange: 400,
          idleVol: 0.12, volRange: 0.25,
          noiseAmt: 0.12, filterFreq: 2000,
          rpmIdle: 1200, rpmMax: 4800,
          hornFreqs: [800, 1000],
          hornType: 'sine', hornVol: 0.3,
        };

      case 'police':
        return {
          osc1Type: 'sawtooth', osc2Type: 'square',
          idleFreq: 55, freqRange: 155,
          idleVol: 0.12, volRange: 0.24,
          noiseAmt: 0.04, filterFreq: 500,
          rpmIdle: 800, rpmMax: 4000,
          hornFreqs: [640, 800],
          hornType: 'square', hornVol: 0.5,
        };

      case 'motorcycle':
        return {
          osc1Type: 'sawtooth', osc2Type: 'square',
          idleFreq: 72, freqRange: 200,
          idleVol: 0.11, volRange: 0.26,
          noiseAmt: 0.05, filterFreq: 600,
          rpmIdle: 1000, rpmMax: 8000,
          hornFreqs: [500, 600],
          hornType: 'square', hornVol: 0.35,
        };

      default: // 'car' — light petrol (Swift, Civic, Fit, Corolla)
        return {
          osc1Type: 'sawtooth', osc2Type: 'square',
          idleFreq: 58, freqRange: 145,
          idleVol: 0.10, volRange: 0.22,
          noiseAmt: 0.04, filterFreq: 450,
          rpmIdle: 800, rpmMax: 3500,
          hornFreqs: [440, 550],
          hornType: 'square', hornVol: 0.45,
        };
    }
  }

  start() {
    if (this._running) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      const p   = this._profile();
      this._profile_cache = p;

      // Master gain
      this._gainNode = this._ctx.createGain();
      this._gainNode.gain.value = p.idleVol;
      this._gainNode.connect(this._ctx.destination);

      // OSC 1 — primary engine tone
      this._osc1 = this._ctx.createOscillator();
      this._osc1.type = p.osc1Type;
      this._osc1.frequency.value = p.idleFreq;
      const g1 = this._ctx.createGain();
      g1.gain.value = 0.55;
      this._osc1.connect(g1);
      g1.connect(this._gainNode);
      this._osc1.start();

      // OSC 2 — harmonic layer
      this._osc2 = this._ctx.createOscillator();
      this._osc2.type = p.osc2Type;
      this._osc2.frequency.value = p.idleFreq * 2.1;
      const g2 = this._ctx.createGain();
      g2.gain.value = 0.18;
      this._osc2.connect(g2);
      g2.connect(this._gainNode);
      this._osc2.start();

      // Mechanical noise
      const bufSize = this._ctx.sampleRate * 2;
      const buf     = this._ctx.createBuffer(1, bufSize, this._ctx.sampleRate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = this._ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop   = true;
      const filter = this._ctx.createBiquadFilter();
      filter.type            = 'lowpass';
      filter.frequency.value = p.filterFreq;
      this._noiseGain = this._ctx.createGain();
      this._noiseGain.gain.value = p.noiseAmt * 0.4;
      noise.connect(filter);
      filter.connect(this._noiseGain);
      this._noiseGain.connect(this._gainNode);
      noise.start();

      this._running = true;
      this._tick();

    } catch(e) {
      console.warn('[EngineSound] Web Audio failed:', e);
    }
  }

  setSpeed(speedKph) {
    this._speed = speedKph;
    const p = this._profile_cache;
    if (!p) return;
    let rpm;
    if      (speedKph < 5)  rpm = p.rpmIdle + speedKph * 80;
    else if (speedKph < 30) rpm = p.rpmIdle + 400  + (speedKph - 5)  * 36;
    else if (speedKph < 60) rpm = p.rpmIdle + 1300 + (speedKph - 30) * 22;
    else if (speedKph < 85) rpm = p.rpmIdle + 1960 + (speedKph - 60) * 26;
    else                    rpm = p.rpmIdle + 2610 + (speedKph - 85) * 12;
    this._targetRpm = Math.min(rpm, p.rpmMax);
  }

  honk() {
    if (!this._ctx || this._hornActive) return;
    this._hornActive = true;
    const p = this._profile();

    const hornGain = this._ctx.createGain();
    hornGain.gain.value = 0;
    hornGain.connect(this._ctx.destination);

    const oscs = p.hornFreqs.map(freq => {
      const o = this._ctx.createOscillator();
      o.type            = p.hornType;
      o.frequency.value = freq;
      o.connect(hornGain);
      o.start();
      return o;
    });

    const now = this._ctx.currentTime;
    hornGain.gain.setValueAtTime(0, now);
    hornGain.gain.linearRampToValueAtTime(p.hornVol, now + 0.02);
    hornGain.gain.setValueAtTime(p.hornVol, now + 0.25);
    hornGain.gain.linearRampToValueAtTime(0, now + 0.38);

    setTimeout(() => {
      oscs.forEach(o => { try { o.stop(); } catch(e) {} });
      this._hornActive = false;
    }, 420);
  }

  _tick() {
    if (!this._running || !this._profile_cache) return;
    const p = this._profile_cache;
    this._currentRpm += (this._targetRpm - this._currentRpm) * 0.08;
    const t     = (this._currentRpm - p.rpmIdle) / (p.rpmMax - p.rpmIdle);
    const tc    = Math.max(0, Math.min(1, t));
    const freq1 = p.idleFreq  + tc * p.freqRange;
    const freq2 = freq1 * 2.1;
    const vol   = p.idleVol   + tc * p.volRange;
    const noise = p.noiseAmt  * (0.3 + tc * 0.7);
    const now   = this._ctx.currentTime;
    this._osc1.frequency.setTargetAtTime(freq1, now, 0.04);
    this._osc2.frequency.setTargetAtTime(freq2, now, 0.04);
    this._gainNode.gain.setTargetAtTime(vol,    now, 0.04);
    this._noiseGain.gain.setTargetAtTime(noise, now, 0.04);
    requestAnimationFrame(() => this._tick());
  }

  _suspend() {
    if (this._ctx?.state === 'running') this._ctx.suspend();
  }

  _resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume();
  }

  stop() {
    if (this._ctx) {
      this._ctx.close();
      this._running = false;
    }
  }
}