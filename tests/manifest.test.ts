import assert from 'node:assert/strict';
import test from 'node:test';
import { parseManifest } from '../src/app/manifest.js';

const validItem = {
  id: 'sample',
  type: 'work',
  title: 'Sample',
  date: '2026-11-26',
  tags: ['art'],
  thumb: '',
  summary: '',
  url: '',
  embed: '',
  urlIcon: 'link',
  embedIcon: 'game'
};

test('parses valid manifest entries', () => {
  assert.deepEqual(parseManifest(JSON.stringify([validItem])), [validItem]);
});

test('rejects invalid manifest roots and entries with a useful location', () => {
  assert.throws(() => parseManifest('{}'), /must be an array/);
  assert.throws(() => parseManifest(JSON.stringify([validItem, { ...validItem, tags: [1] }])), /entry 2 is invalid/);
  assert.throws(() => parseManifest('{'), SyntaxError);
});

test('accepts all supported destination icons', () => {
  const item = {
    ...validItem,
    urlIcon: 'itch',
    embedIcon: 'video'
  };

  assert.deepEqual(parseManifest(JSON.stringify([item])), [item]);
});

test('rejects unsupported destination icon kinds', () => {
  assert.throws(
    () => parseManifest(JSON.stringify([{ ...validItem, embedIcon: 'unknown' }])),
    /entry 1 is invalid/
  );
});
