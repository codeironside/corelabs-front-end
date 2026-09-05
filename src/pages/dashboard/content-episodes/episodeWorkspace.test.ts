import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canSaveEpisodeDraft,
  episodeCatalogId,
  resolveEpisodeSaveAction,
  sameCatalogId,
} from './episodeWorkspace.ts';

test('save action is create until a catalog episode id exists, then update', () => {
  assert.equal(resolveEpisodeSaveAction(undefined), 'create');
  assert.equal(resolveEpisodeSaveAction(''), 'create');
  assert.equal(resolveEpisodeSaveAction('   '), 'create');
  assert.equal(resolveEpisodeSaveAction('64aa0c1f2b3d4e5f67890123'), 'update');
});

test('save is disabled without both a parent module and a title', () => {
  assert.equal(canSaveEpisodeDraft({ moduleId: '', title: 'Pilot' }), false);
  assert.equal(canSaveEpisodeDraft({ moduleId: 'mod-1', title: '   ' }), false);
  assert.equal(canSaveEpisodeDraft({ moduleId: 'mod-1', title: 'Pilot' }), true);
});

test('catalog ids compare as strings even when mongoose-shaped', () => {
  assert.equal(episodeCatalogId({ $oid: '64aa0c1f2b3d4e5f67890123' }), '64aa0c1f2b3d4e5f67890123');
  assert.ok(sameCatalogId({ _id: '64aa0c1f2b3d4e5f67890123' }, '64aa0c1f2b3d4e5f67890123'));
});
