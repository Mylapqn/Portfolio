import assert from 'node:assert/strict';
import test from 'node:test';
import { addVersionToModuleImports } from '../build/assets.js';

test('versions static and dynamic relative module imports', () => {
  const source = [
    "import { start } from './app/feed.js';",
    "export { load } from './app/manifest.js';",
    "const lazy = import('./app/lazy.js');",
    "import library from 'library';",
    "import extension from 'library/extension.js';"
  ].join('\n');

  assert.equal(
    addVersionToModuleImports(source, 'build 42'),
    [
      "import { start } from './app/feed.js?v=build%2042';",
      "export { load } from './app/manifest.js?v=build%2042';",
      "const lazy = import('./app/lazy.js?v=build%2042');",
      "import library from 'library';",
      "import extension from 'library/extension.js';"
    ].join('\n')
  );
});
