import assert from 'node:assert/strict';
import test from 'node:test';
import { injectTokens } from '../build/template.js';
import { normalizeBasePath } from '../build/config.js';

test('replaces template placeholders once and inserts token values literally', () => {
  assert.equal(
    injectTokens('{{TITLE}} / {{CONTENT}} / {{UNKNOWN}}', {
      TITLE: '{{CONTENT}} $&',
      CONTENT: '$`$\''
    }),
    "{{CONTENT}} $& / $`$' / {{UNKNOWN}}"
  );
});

test('normalizes valid deployment paths and rejects traversal segments', () => {
  assert.equal(normalizeBasePath('/Portfolio/'), '/Portfolio');
  assert.equal(normalizeBasePath(''), '');
  assert.throws(() => normalizeBasePath('/Portfolio/../private'), /Invalid SITE_BASE_PATH/);
});
