import assert from 'node:assert/strict';

import { test } from 'node:test';

import {

  characterHandleKey,

  parseThemeCharacterTtsProfiles,

  resolveLineTtsFromSpeaker,

} from './characterTts.ts';



const mentions = [

  { id: '1', handle: '@Shehu', name: 'Shehu' },

  { id: '2', handle: '@Amina', name: 'Amina' },

];



const themeJson = JSON.stringify({

  characters: [

    { handle: '@Shehu', name: 'Shehu', ttsVoiceProfile: 'lagos-calm-male', ttsTonePreset: 'dramatic', ttsToneDirection: 'urgent anchor desk', ttsPacePreset: 'fast', ttsPitchPercent: -25 },

    { handle: '@Amina', name: 'Amina', ttsVoiceProfile: 'lagos-warm-female', ttsTonePreset: 'intimate', ttsToneDirection: 'soft confessional', ttsPacePreset: 'slow', ttsPitchPercent: 30 },

  ],

});



test('parseThemeCharacterTtsProfiles reads per-character theme presets', () => {

  const profiles = parseThemeCharacterTtsProfiles(themeJson, mentions, 'neutral-global-female');

  assert.equal(profiles[characterHandleKey('@Shehu')]?.tonePreset, 'dramatic');

  assert.equal(profiles[characterHandleKey('@Amina')]?.tonePreset, 'intimate');

  assert.equal(profiles[characterHandleKey('@Shehu')]?.toneDirection, 'urgent anchor desk');

  assert.equal(profiles[characterHandleKey('@Shehu')]?.pacePreset, 'fast');

  assert.equal(profiles[characterHandleKey('@Amina')]?.pitchPercent, 30);

});



test('parseThemeCharacterTtsProfiles assigns distinct defaults when theme omits presets', () => {

  const sparseJson = JSON.stringify({ characters: [{ handle: '@Shehu' }, { handle: '@Amina' }] });

  const profiles = parseThemeCharacterTtsProfiles(sparseJson, mentions, 'lagos-warm-female');

  assert.notEqual(profiles[characterHandleKey('@Shehu')]?.tonePreset, profiles[characterHandleKey('@Amina')]?.tonePreset);

});



test('parseThemeCharacterTtsProfiles migrates legacy pitch preset slugs', () => {

  const legacyJson = JSON.stringify({ characters: [{ handle: '@Shehu', ttsPitchPreset: 'high' }] });

  const profiles = parseThemeCharacterTtsProfiles(legacyJson, mentions.slice(0, 1), 'lagos-warm-female');

  assert.equal(profiles[characterHandleKey('@Shehu')]?.pitchPercent, 25);

});



test('resolveLineTtsFromSpeaker uses character theme profile and ignores episode mood', () => {

  const profiles = parseThemeCharacterTtsProfiles(themeJson, mentions, 'neutral-global-female');

  const resolved = resolveLineTtsFromSpeaker('@Shehu', profiles, 'neutral-global-female', { preset: 'calm', direction: 'soft episode mood', pitch: 10 });

  assert.equal(resolved.voiceProfile, 'lagos-calm-male');

  assert.equal(resolved.tone.preset, 'dramatic');

  assert.equal(resolved.tone.direction, 'urgent anchor desk');

  assert.equal(resolved.tone.pace, 'fast');

  assert.equal(resolved.tone.pitch, -25);

});



test('resolveLineTtsFromSpeaker applies episode mood for narrator lines', () => {

  const profiles = parseThemeCharacterTtsProfiles(themeJson, mentions, 'neutral-global-female');

  const resolved = resolveLineTtsFromSpeaker(undefined, profiles, 'neutral-global-female', { preset: 'calm', direction: 'reflective episode mood', pitch: 15 });

  assert.equal(resolved.voiceProfile, 'neutral-global-female');

  assert.equal(resolved.tone.preset, 'calm');

  assert.equal(resolved.tone.direction, 'reflective episode mood');

  assert.equal(resolved.tone.pitch, 15);

});

