import assert from 'node:assert/strict';
import test from 'node:test';
import { parseFrontmatter } from '../shared/frontmatter.js';

test('parses key/value fields and removes one optional body separator line', () => {
  const parsed = parseFrontmatter(
    '---\r\ntitle: A title: with colon\r\ntags: art, games\r\n---\r\n\r\nBody\r\n'
  );

  assert.deepEqual(parsed.metadata, {
    title: 'A title: with colon',
    tags: 'art, games'
  });
  assert.equal(parsed.body, 'Body\n');
});

test('leaves Markdown unchanged when frontmatter is missing or unterminated', () => {
  for (const markdown of ['Body\r\ntext', '---\r\ntitle: Incomplete\r\nBody']) {
    const parsed = parseFrontmatter(markdown);
    assert.deepEqual(parsed.metadata, {});
    assert.equal(parsed.body, markdown.replace(/\r\n/g, '\n'));
  }
});
