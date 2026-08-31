export type ThemeCharacterPromptCharacter = {
  name: string;
  handle: string;
  role: string;
  motivations: string;
  quirks: string;
  visualPrompt: string;
};

export type ThemeCharacterPromptContext = {
  name: string;
  pitch: string;
  setting: string;
  locations: string;
  atmosphere: string;
  rules: string;
  formal: number;
  humorous: number;
  formatting: string;
  negatives: string[];
  tags: string[];
};

const ContextFieldMaxLength = 900;
const VisualPromptMaxLength = 1400;

function compactPromptField(value: string, fallback: string, maxLength = ContextFieldMaxLength): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

export function buildThemeCharacterImagePrompt({
  character,
  theme,
  handle,
}: {
  character: ThemeCharacterPromptCharacter;
  theme: ThemeCharacterPromptContext;
  handle: string;
}): string {
  return [
    "Generate a reusable character reference image for this Theme's visual bible.",
    "",
    "Theme identity:",
    `- Theme name: ${compactPromptField(theme.name, "Untitled theme", 180)}`,
    `- Elevator pitch: ${compactPromptField(theme.pitch, "Not specified")}`,
    `- Marketplace tags: ${theme.tags.join(", ") || "None"}`,
    "",
    "World-building and lore constraints:",
    `- Setting and time period: ${compactPromptField(theme.setting, "Not specified")}`,
    `- Physical locations: ${compactPromptField(theme.locations, "Not specified")}`,
    `- Atmospheric vibe: ${compactPromptField(theme.atmosphere, "Not specified")}`,
    `- Core rules / boundaries: ${compactPromptField(theme.rules, "No strict boundaries set", 1200)}`,
    "",
    "Tone and style constraints:",
    `- Formal vs casual: ${theme.formal}/100 formal`,
    `- Humorous vs serious: ${theme.humorous}/100 humorous`,
    `- Formatting / style directives: ${compactPromptField(theme.formatting, "Not specified")}`,
    `- Do not use: ${theme.negatives.join(", ") || "None"}`,
    "",
    "Character identity:",
    `- Name: ${compactPromptField(character.name, "Unnamed character", 180)}`,
    `- Handle: ${handle || "Unset"}`,
    `- Role: ${compactPromptField(character.role, "Not specified")}`,
    `- Core motivations: ${compactPromptField(character.motivations, "Not specified")}`,
    `- Behavioral quirks: ${compactPromptField(character.quirks, "Not specified")}`,
    `- Base visual prompt: ${compactPromptField(character.visualPrompt, "Not specified", VisualPromptMaxLength)}`,
    "",
    "Image generation requirements:",
    "- Produce one clear character reference image suitable for future episode character continuity.",
    "- Make the character visually compatible with the Theme's setting, locations, atmosphere, rules, and tone.",
    "- Preserve the character's role, motivations, quirks, face, body type, wardrobe cues, posture, and recognisable silhouette.",
    "- Do not introduce visual details that conflict with the Theme's world-building or banned terms.",
    "- Avoid generic stock-character styling; make the result specific enough to reuse as a character anchor.",
  ].join("\n");
}
