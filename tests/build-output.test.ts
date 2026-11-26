import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('build emits complete standalone pages and deployment-prefixed assets', () => {
  execSync('npm run build', {
    cwd: root,
    env: { ...process.env, SITE_BASE_PATH: '/Portfolio' },
    stdio: 'pipe'
  });

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist/manifest.json'), 'utf8')) as {
    id: string;
    embed: string;
  }[];
  const homePage = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.ok(manifest.length > 0);
  assert.match(homePage, /href="\/Portfolio\/style\.css\?v=/);
  assert.match(fs.readFileSync(path.join(root, 'dist/style.css'), 'utf8'), /\/Portfolio\/styles\/base\.css/);
  const version = homePage.match(/app\.js\?v=(\d+)/)?.[1];
  assert.ok(version);

  const appEntry = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
  assert.match(appEntry, new RegExp(`feed\\.js\\?v=${version}`));

  for (const item of manifest) {
    assert.ok(fs.existsSync(path.join(root, 'dist/p', item.id, 'index.html')));
  }

  const modules = [path.join(root, 'dist/app.js'), ...listJavaScriptFiles(path.join(root, 'dist/app'))];
  for (const modulePath of modules) {
    const source = fs.readFileSync(modulePath, 'utf8');
    const imports = source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g);
    for (const [, specifier] of imports) {
      if (specifier.startsWith('.')) {
        assert.ok(specifier.endsWith(`.js?v=${version}`), `${modulePath} has an unversioned import: ${specifier}`);
      }
    }
  }

  const embeddedItem = manifest.find((item) => item.embed);
  assert.ok(embeddedItem);
  const page = fs.readFileSync(path.join(root, 'dist/p', embeddedItem.id, 'index.html'), 'utf8');
  assert.match(page, /<iframe[^>]+title="Embedded portfolio project"/);
});

function listJavaScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(filePath);
    return entry.isFile() && filePath.endsWith('.js') ? [filePath] : [];
  });
}
