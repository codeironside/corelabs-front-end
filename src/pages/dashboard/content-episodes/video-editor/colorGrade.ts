import type { CSSProperties } from 'react';
import type { ColorGradeState } from './types';

export const DEFAULT_COLOR_GRADE: ColorGradeState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  exposure: 0,
  shadows: 0,
  highlights: 0,
};

export function videoPreviewStyle(color: ColorGradeState, opacity: number): CSSProperties {
  const brightness = 1 + (color.brightness + color.exposure * 0.6) / 100;
  const contrast = 1 + color.contrast / 100;
  const saturate = 1 + color.saturation / 100;
  const warmth = color.temperature / 100;
  const shadowLift = color.shadows / 200;
  const highlightCompress = 1 - color.highlights / 300;

  return {
    opacity: opacity / 100,
    filter: [
      `brightness(${brightness + shadowLift})`,
      `contrast(${contrast * highlightCompress})`,
      `saturate(${saturate})`,
      `sepia(${Math.max(0, warmth * 0.35)})`,
      `hue-rotate(${color.temperature * 0.4}deg)`,
    ].join(' '),
  };
}

export function mergeVideoPreviewStyle(
  color: ColorGradeState,
  inspectorOpacity: number,
  extra?: CSSProperties,
): CSSProperties {
  const base = videoPreviewStyle(color, inspectorOpacity);
  if (!extra) return base;
  const baseOpacity = typeof base.opacity === 'number' ? base.opacity : 1;
  const extraOpacity = typeof extra.opacity === 'number' ? extra.opacity : 1;
  return {
    ...base,
    ...extra,
    opacity: baseOpacity * extraOpacity,
    filter: base.filter,
  };
}
