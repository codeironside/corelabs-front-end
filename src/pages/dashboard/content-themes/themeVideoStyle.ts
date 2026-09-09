const THEME_BUILDER_MARKER = 'THEME_BUILDER_JSON';

export const VIDEO_STYLE_HELPER =
  'Describe the visual medium and rendering approach for this world — e.g. stylized 2D animation, photorealistic live-action look, anime-influenced, stop-motion, painterly. This is distinct from mood/tone (set in Atmospheric Vibe above) — this field tells the AI what kind of image it\'s generating, not what it feels like.';

export const MISSING_VIDEO_STYLE_MESSAGE =
  'Video Style is missing. Atmospheric Vibe only covers mood and lighting — set a rendering medium (animation, live-action look, anime, stop-motion, painterly, etc.) before generating further scenes.';

type ThemeVideoStyleSource = {
  _id?: string;
  videoStyle?: string | null;
  defaultStoryPrompt?: string | null;
};

function extractBuilderJson(source: string): Record<string, unknown> | null {
  const match = source.match(new RegExp(`${THEME_BUILDER_MARKER}\\s*\`\`\`json\\s*([\\s\\S]*?)\`\`\``));
  if (!match?.[1]) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function parseThemeVideoStyle(theme?: ThemeVideoStyleSource | null): string {
  const fromField = theme?.videoStyle?.trim();
  if (fromField) return fromField;

  const source = theme?.defaultStoryPrompt ?? '';
  const snapshot = extractBuilderJson(source);
  if (typeof snapshot?.videoStyle === 'string' && snapshot.videoStyle.trim()) {
    return snapshot.videoStyle.trim();
  }

  return source.match(/^Video style:\s*(.*)$/m)?.[1]?.trim().replace(/^Unset$/i, '') ?? '';
}

export function themeNeedsVideoStyle(theme?: ThemeVideoStyleSource | null): boolean {
  return Boolean(theme?._id) && !parseThemeVideoStyle(theme);
}
