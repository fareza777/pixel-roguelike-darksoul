// Procedural dark-fantasy audio: ambient drone, sparse bells, combat SFX.
export class DungeonAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.mood = "calm";
    this.bellTimer = 5;
    this.heartTimer = 0;
    this.bossActive = false;
  }

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.62;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.28;
    this.master.connect(this.comp).connect(ctx.destination);

    const len = Math.floor(ctx.sampleRate * 2.2);
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // wind bed
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuf;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = "lowpass"; wf.frequency.value = 240; wf.Q.value = 0.8;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.028;
    wind.connect(wf).connect(this.windGain).connect(this.master);
    wind.start();

    // drone stack
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.0;
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.value = 260;
    this.droneFilter.Q.value = 1.2;
    const trem = ctx.createGain();
    trem.gain.value = 0.86;
    this.droneGain.connect(trem).connect(this.droneFilter).connect(this.master);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.14;
    lfo.connect(lfoGain).connect(trem.gain);
    lfo.start();

    const mk = (freq, type, vol, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = freq; o.detune.value = detune;
      const g = ctx.createGain(); g.gain.value = vol;
      o.connect(g).connect(this.droneGain);
      o.start();
      return o;
    };
    this.drones = [
      mk(36.71, "sine", 0.5), mk(73.42, "sawtooth", 0.16, -6),
      mk(110, "sawtooth", 0.09, 7), mk(174.61, "sine", 0.1),
      mk(220, "sine", 0.045, -3),
    ];

    this.setMood("calm");
    this.resume();
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(m ? 0 : 0.62, this.ctx.currentTime, 0.08);
  }

  setMood(mood) {
    this.mood = mood;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const boss = mood === "boss";
    this.droneGain.gain.setTargetAtTime(boss ? 0.16 : mood === "tense" ? 0.11 : 0.085, t, 1.4);
    this.droneFilter.frequency.setTargetAtTime(boss ? 430 : mood === "tense" ? 320 : 245, t, 1.8);
    this.windGain.gain.setTargetAtTime(boss ? 0.018 : 0.03, t, 2);
  }

  update(dt) {
    if (!this.ctx || this.muted) return;
    this.bellTimer -= dt;
    if (this.bellTimer <= 0) {
      this.bellTimer = 9 + Math.random() * 12;
      const notes = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23];
      const f = notes[Math.floor(Math.random() * notes.length)];
      this.chime(f, 0.028, 2.6);
    }
    if (this.mood === "boss" && this.bossActive) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.heartTimer = this.phase2 ? 0.68 : 1.05;
        this.kick();
      }
    }
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone({ freq = 220, to = null, type = "sine", vol = 0.1, attack = 0.005, dur = 0.2, delay = 0, filter = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = filter;
      o.connect(f); node = f;
    }
    node.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise({ dur = 0.15, vol = 0.12, type = "lowpass", freq = 800, to = null, q = 0.8, delay = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  chime(freq, vol = 0.04, dur = 2.2, delay = 0) {
    this.tone({ freq, type: "sine", vol, attack: 0.02, dur, delay });
    this.tone({ freq: freq * 2.01, type: "sine", vol: vol * 0.5, attack: 0.02, dur: dur * 0.7, delay });
    this.tone({ freq: freq * 0.5, type: "sine", vol: vol * 0.4, attack: 0.03, dur, delay });
  }

  kick() {
    this.tone({ freq: 54, to: 34, type: "sine", vol: 0.18, attack: 0.004, dur: 0.26 });
    this.noise({ dur: 0.09, vol: 0.05, freq: 240 });
  }

  swing(step = 0) {
    this.noise({ dur: 0.11 + step * 0.02, vol: 0.16, type: "bandpass", freq: 2100 + step * 400, to: 620, q: 1.4 });
    this.tone({ freq: 330 + step * 60, to: 150, type: "triangle", vol: 0.045, dur: 0.12 });
  }

  hit(crit = false) {
    this.noise({ dur: 0.1, vol: 0.2, freq: 1200, to: 260 });
    this.tone({ freq: crit ? 150 : 105, to: crit ? 70 : 48, type: "sine", vol: 0.2, dur: crit ? 0.22 : 0.15 });
    if (crit) this.tone({ freq: 1400, to: 900, type: "square", vol: 0.035, dur: 0.1 });
  }

  hurt() {
    this.tone({ freq: 170, to: 62, type: "sawtooth", vol: 0.13, dur: 0.28, filter: 900 });
    this.noise({ dur: 0.18, vol: 0.12, freq: 900, to: 200 });
  }

  dash() {
    this.noise({ dur: 0.22, vol: 0.13, type: "bandpass", freq: 500, to: 2600, q: 2 });
  }

  step() {
    this.noise({ dur: 0.045, vol: 0.035, freq: 340, to: 140 });
  }

  projectile() {
    this.tone({ freq: 300, to: 620, type: "triangle", vol: 0.05, dur: 0.3 });
    this.noise({ dur: 0.2, vol: 0.05, type: "bandpass", freq: 900, to: 1800, q: 3 });
  }

  orbHit() {
    this.tone({ freq: 240, to: 70, type: "sine", vol: 0.12, dur: 0.3 });
    this.noise({ dur: 0.2, vol: 0.1, type: "bandpass", freq: 700, to: 200 });
  }

  chest() {
    const seq = [293.66, 349.23, 440, 587.33];
    seq.forEach((f, i) => this.tone({ freq: f, type: "triangle", vol: 0.055, dur: 0.55, delay: i * 0.07 }));
    this.noise({ dur: 0.25, vol: 0.07, freq: 620, to: 250 });
  }

  sigil() {
    [293.66, 369.99, 440, 587.33].forEach((f, i) =>
      this.tone({ freq: f, type: "sine", vol: 0.055, attack: 0.05, dur: 1.6, delay: i * 0.09 }));
    this.chime(587.33, 0.03, 2.8, 0.25);
  }

  door(open = true) {
    this.tone({ freq: open ? 70 : 92, to: 40, type: "sawtooth", vol: 0.08, dur: 0.5, filter: 300 });
    this.noise({ dur: 0.4, vol: 0.08, freq: 380, to: 160 });
    if (open) this.noise({ dur: 0.06, vol: 0.05, freq: 1800, delay: 0.32 });
  }

  locked() {
    this.noise({ dur: 0.07, vol: 0.1, freq: 900, to: 420 });
    this.tone({ freq: 120, to: 80, type: "square", vol: 0.04, dur: 0.1 });
  }

  unlock() {
    this.tone({ freq: 620, to: 780, type: "square", vol: 0.03, dur: 0.08 });
    this.tone({ freq: 320, to: 180, type: "triangle", vol: 0.07, dur: 0.35, delay: 0.06 });
  }

  heal() {
    [392, 493.88, 587.33, 784].forEach((f, i) =>
      this.tone({ freq: f, type: "sine", vol: 0.045, attack: 0.06, dur: 0.9, delay: i * 0.08 }));
  }

  pickup() {
    this.tone({ freq: 740, type: "sine", vol: 0.055, dur: 0.18 });
    this.tone({ freq: 988, type: "sine", vol: 0.04, dur: 0.25, delay: 0.06 });
  }

  secret() {
    this.noise({ dur: 0.8, vol: 0.12, freq: 260, to: 90 });
    this.tone({ freq: 90, to: 45, type: "sine", vol: 0.12, dur: 0.7 });
    this.chime(523.25, 0.025, 1.8, 0.5);
  }

  death() {
    this.tone({ freq: 110, to: 55, type: "sawtooth", vol: 0.12, dur: 2.4, filter: 400 });
    this.tone({ freq: 55, type: "sine", vol: 0.16, dur: 3.2 });
    this.noise({ dur: 1.4, vol: 0.08, freq: 500, to: 80 });
  }

  roar() {
    this.tone({ freq: 48, to: 30, type: "sawtooth", vol: 0.2, attack: 0.08, dur: 1.3, filter: 240 });
    this.noise({ dur: 1.1, vol: 0.16, freq: 300, to: 90 });
    this.tone({ freq: 92, to: 60, type: "square", vol: 0.06, attack: 0.1, dur: 1.2, filter: 500 });
  }

  slam() {
    this.tone({ freq: 62, to: 28, type: "sine", vol: 0.28, attack: 0.003, dur: 0.7 });
    this.noise({ dur: 0.6, vol: 0.22, freq: 700, to: 80 });
    this.noise({ dur: 0.12, vol: 0.1, freq: 2200, to: 700 });
  }

  bossDeath() {
    this.roar();
    this.tone({ freq: 73.42, to: 36.71, type: "sawtooth", vol: 0.15, dur: 3.4, filter: 260, delay: 0.4 });
    this.noise({ dur: 2.6, vol: 0.1, freq: 400, to: 60, delay: 0.2 });
  }

  victory() {
    const seq = [220, 261.63, 293.66, 349.23, 440, 523.25];
    seq.forEach((f, i) => {
      this.tone({ freq: f, type: "sine", vol: 0.05, attack: 0.08, dur: 2.8, delay: i * 0.16 });
      this.tone({ freq: f / 2, type: "triangle", vol: 0.035, dur: 3.2, delay: i * 0.16 });
    });
    this.chime(523.25, 0.04, 4, 0.9);
  }
}
