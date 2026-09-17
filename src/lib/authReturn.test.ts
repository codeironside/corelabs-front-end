import assert from 'node:assert/strict';
import test from 'node:test';
import { loginHref, safeReturnTo } from './authReturn';

test('safeReturnTo preserves an internal path with query and hash', () => {
  assert.equal(
    safeReturnTo('/app?studioTab=episodes#scene-2'),
    '/app?studioTab=episodes#scene-2',
  );
});

test('safeReturnTo rejects external and protocol-relative redirects', () => {
  assert.equal(safeReturnTo('https://evil.example/steal'), '/app');
  assert.equal(safeReturnTo('//evil.example/steal'), '/app');
  assert.equal(safeReturnTo('/\\evil.example/steal'), '/app');
});

test('loginHref safely encodes the intended destination', () => {
  assert.equal(loginHref('/app?onboarding=1'), '/login?returnTo=%2Fapp%3Fonboarding%3D1');
});
