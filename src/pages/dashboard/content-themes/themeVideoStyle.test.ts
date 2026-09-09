import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseThemeVideoStyle, themeNeedsVideoStyle } from './themeVideoStyle.ts';

test('parseThemeVideoStyle prefers the schema field', () => {
  assert.equal(
    parseThemeVideoStyle({
      videoStyle: 'stylized 2D animation',
      defaultStoryPrompt: 'Video style: Unset',
    }),
    'stylized 2D animation',
  );
});

test('parseThemeVideoStyle reads builder JSON for older themes', () => {
  const prompt = [
    'THEME_BUILDER_JSON',
    '```json',
    JSON.stringify({ videoStyle: 'anime-influenced night market' }),
    '```',
  ].join('\n');
  assert.equal(parseThemeVideoStyle({ defaultStoryPrompt: prompt }), 'anime-influenced night market');
});

test('themeNeedsVideoStyle flags saved themes with an empty field', () => {
  assert.equal(themeNeedsVideoStyle({ _id: 'eko', videoStyle: '', defaultStoryPrompt: 'Atmospheric vibe: rain' }), true);
  assert.equal(themeNeedsVideoStyle({ _id: 'eko', videoStyle: 'live-action look' }), false);
  assert.equal(themeNeedsVideoStyle(undefined), false);
});
