export function waveformBars(seed: string, count = 34) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin((index + 1) * 0.72 + hash * 0.00001);
    const pulse = Math.sin((index + 1) * 1.91 + hash * 0.00003);
    return Math.round(18 + Math.abs(wave * 22) + Math.abs(pulse * 14));
  });
}
