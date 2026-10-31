// Web Audio API Synthesizer for high-fidelity, zero-dependency game sound effects

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type = "sine", duration = 0.15, gainVal = 0.2, delay = 0) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.warn("Audio error", e);
      }
    }, delay * 1000);
  }

  playClick() {
    this.playTone(800, "triangle", 0.05, 0.1);
  }

  playTick() {
    this.playTone(600, "sine", 0.04, 0.08);
  }

  playUrgentTick() {
    this.playTone(950, "square", 0.08, 0.15);
  }

  playCorrect() {
    if (this.isMuted) return;
    this.initContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      this.playTone(freq, "sine", 0.25, 0.25, idx * 0.08);
    });
  }

  playWrong() {
    if (this.isMuted) return;
    this.initContext();
    this.playTone(220, "sawtooth", 0.2, 0.2, 0);
    this.playTone(180, "sawtooth", 0.3, 0.25, 0.12);
  }

  playPodium() {
    if (this.isMuted) return;
    this.initContext();
    const fanfare = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 659.25, d: 0.15, t: 0.12 },
      { f: 783.99, d: 0.2, t: 0.24 },
      { f: 1046.5, d: 0.45, t: 0.4 },
    ];
    fanfare.forEach((n) => {
      this.playTone(n.f, "triangle", n.d, 0.3, n.t);
    });
  }

  playAvatarPop(freq = 700) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, t + 0.09);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {
      console.warn("Audio pop error", e);
    }
  }

  playAvatarBoing() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(680, t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.22);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {
      console.warn("Audio boing error", e);
    }
  }

  playAvatarGiggle() {
    if (this.isMuted) return;
    this.initContext();
    const notes = [659.25, 783.99, 987.77, 1318.5]; // E5, G5, B5, E6
    notes.forEach((freq, idx) => {
      this.playTone(freq, "sine", 0.08, 0.15, idx * 0.04);
    });
  }

  playSpinTick() {
    if (this.isMuted) return;
    this.initContext();
    this.playTone(1100 + Math.random() * 300, "triangle", 0.03, 0.1);
  }

  playSpinLand() {
    if (this.isMuted) return;
    this.initContext();
    const chime = [523.25, 659.25, 783.99, 1046.5];
    chime.forEach((f, idx) => {
      this.playTone(f, "triangle", 0.2, 0.22, idx * 0.06);
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const soundManager = new SoundEffects();
