export function clampSeconds(seconds: number, totalDuration: number) {
  return Math.min(totalDuration, Math.max(0, seconds));
}

export function secondsFromPixel(clientX: number, rect: DOMRect, pixelsPerSecond: number, totalDuration: number, offsetLeft = 0) {
  return clampSeconds((clientX - rect.left - offsetLeft) / pixelsPerSecond, totalDuration);
}

export function secondsFromPercent(clientX: number, rect: DOMRect, totalDuration: number) {
  const ratio = (clientX - rect.left) / Math.max(1, rect.width);
  return clampSeconds(ratio * totalDuration, totalDuration);
}
