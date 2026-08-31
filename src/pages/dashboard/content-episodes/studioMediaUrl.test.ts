import assert from 'node:assert/strict';
import { test } from 'node:test';
import { studioStreamMediaUrl } from './studioMediaUrl.ts';

test('studioStreamMediaUrl prefers cloudinary over fallback', () => {
  assert.equal(
    studioStreamMediaUrl('https://res.cloudinary.com/demo/video/upload/v1/a.mp3', 'https://s3.example.test/a.mp3'),
    'https://res.cloudinary.com/demo/video/upload/v1/a.mp3',
  );
});

test('studioStreamMediaUrl rewrites legacy raw Cloudinary audio to video delivery', () => {
  assert.equal(
    studioStreamMediaUrl('https://res.cloudinary.com/demo/raw/upload/v123/studio_episode-tts/file.mp3'),
    'https://res.cloudinary.com/demo/video/upload/v123/studio_episode-tts/file.mp3',
  );
});
