import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProducerSseBlock } from './producerEvents.ts';

test('parses ordered Producer SSE events', () => {
  assert.deepEqual(
    parseProducerSseBlock('id: 42\nevent: checklist\ndata: {"status":"running"}'),
    { id: '42', type: 'checklist', data: { status: 'running' } },
  );
});

test('joins multiline data and accepts plain text', () => {
  assert.deepEqual(
    parseProducerSseBlock('event: notice\ndata: first\ndata: second'),
    { id: undefined, type: 'notice', data: 'first\nsecond' },
  );
  assert.equal(parseProducerSseBlock(': heartbeat'), null);
});
