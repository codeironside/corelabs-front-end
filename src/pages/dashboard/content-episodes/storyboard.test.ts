import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseThemeCharacterReferences } from './storyboard.ts';

test('parseThemeCharacterReferences uses s3Url when gallery url is empty', () => {
  const storedUrl = 'https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/studio%2Feko.png?alt=media';
  const theme = {
    defaultStoryPrompt: [
      'THEME_BUILDER_JSON',
      '```json',
      JSON.stringify({
        characters: [
          {
            id: 'c1',
            name: 'The Eko Shadow',
            handle: '@TheEkoShadow',
            gallery: [{ id: 'g1', label: '@TheEkoShadow variant', url: '', s3Url: storedUrl }],
          },
        ],
      }),
      '```',
    ].join('\n'),
  };

  const refs = parseThemeCharacterReferences(theme);
  assert.equal(refs.length, 1);
  assert.equal(refs[0]?.url, storedUrl);
  assert.equal(refs[0]?.handle, '@TheEkoShadow');
});
