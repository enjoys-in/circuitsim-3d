export interface Spectrum {
  freqs: number[];
  mags: number[];
}

// Single-sided amplitude spectrum via a direct DFT (DC removed). Sample count is small
// here (transient frames), so the O(n^2) transform is fine and keeps the code dependency-free.
export function computeSpectrum(values: (number | null)[], dt: number): Spectrum {
  const samples = values.map((v) => (v === null || !Number.isFinite(v) ? 0 : v));
  const n = samples.length;
  const freqs: number[] = [];
  const mags: number[] = [];
  if (n < 2 || dt <= 0) return { freqs, mags };
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  const half = Math.floor(n / 2);
  for (let k = 0; k < half; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      const v = samples[t] - mean;
      re += v * Math.cos(angle);
      im += v * Math.sin(angle);
    }
    freqs.push(k / (n * dt));
    mags.push((Math.hypot(re, im) * 2) / n);
  }
  return { freqs, mags };
}
