interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

const VOLUME = 0.06;

// Small Web Audio wrapper: one oscillator per sounding component, keyed by id.
class AudioEngine {
  private ctx: AudioContext | null = null;
  private voices = new Map<string, Voice>();
  private muted = false;

  ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.silenceAll();
  }

  set(id: string, frequency: number, on: boolean, type: OscillatorType = "square"): void {
    if (!on || this.muted) {
      this.stop(id);
      return;
    }
    const ctx = this.ensure();
    if (!ctx) return;
    let voice = this.voices.get(id);
    if (!voice) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.01);
      voice = { osc, gain };
      this.voices.set(id, voice);
    }
    voice.osc.frequency.setTargetAtTime(frequency, ctx.currentTime, 0.01);
  }

  retain(activeIds: Set<string>): void {
    for (const id of [...this.voices.keys()]) if (!activeIds.has(id)) this.stop(id);
  }

  private stop(id: string): void {
    const voice = this.voices.get(id);
    if (!voice) return;
    try {
      voice.gain.gain.cancelScheduledValues(this.ctx?.currentTime ?? 0);
      voice.osc.stop();
    } catch {
      /* already stopped */
    }
    this.voices.delete(id);
  }

  silenceAll(): void {
    for (const id of [...this.voices.keys()]) this.stop(id);
  }
}

export const audioEngine = new AudioEngine();
