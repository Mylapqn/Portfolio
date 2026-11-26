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
    type: string;
    color?: string;
    embed: string;
    embedIcon: string;
  }[];
  const homePage = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.ok(manifest.length > 0);
  assert.ok(fs.existsSync(path.join(root, 'dist/assets/icons/video.svg')));
  assert.match(homePage, /href="\/Portfolio\/style\.css\?v=/);
  assert.match(fs.readFileSync(path.join(root, 'dist/style.css'), 'utf8'), /\/Portfolio\/styles\/base\.css/);
  const pageColorStyles = fs.readFileSync(path.join(root, 'dist/styles/page-colors.css'), 'utf8');
  const version = homePage.match(/app\.js\?v=(\d+)/)?.[1];
  assert.ok(version);

  const appEntry = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
  assert.match(appEntry, new RegExp(`feed\\.js\\?v=${version}`));

  for (const item of manifest) {
    assert.ok(fs.existsSync(path.join(root, 'dist/p', item.id, 'index.html')));
  }

  const coloredWork = manifest.find((item) => item.type === 'work' && item.color);
  assert.ok(coloredWork);
  const coloredPage = fs.readFileSync(path.join(root, 'dist/p', coloredWork.id, 'index.html'), 'utf8');
  assert.match(coloredPage, new RegExp(`href="/Portfolio/styles/page-colors\\.css\\?v=${version}"`));
  assert.match(coloredPage, /<body class="work-page page-bg-[0-9a-f]{6}">/);
  assert.doesNotMatch(coloredPage, /<body[^>]+style=/);
  assert.doesNotMatch(coloredPage, /data-page-style|document\.body\.style\.cssText/);
  const colorClass = coloredPage.match(/<body class="work-page (page-bg-[0-9a-f]{6})">/)?.[1];
  assert.ok(colorClass);
  assert.match(pageColorStyles, new RegExp(`\\.${colorClass} \\{\\s*--page-bg: #[0-9a-f]{6};\\s*\\}`));

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
  const deathWish = manifest.find((item) => item.id === 'deathwish');
  assert.ok(deathWish);
  assert.equal(deathWish.embedIcon, 'itch');
  const deathWishPage = fs.readFileSync(path.join(root, 'dist/p/deathwish/index.html'), 'utf8');
  assert.match(deathWishPage, /class="btn"[^>]*><span class="destination-marker button-icon"[^>]*><img class="destination-icon" src="\/Portfolio\/assets\/icons\/itch\.svg"/);
  assert.match(deathWishPage, /class="stage"><span class="destination-marker stage-icon"[^>]*><img class="destination-icon" src="\/Portfolio\/assets\/icons\/itch\.svg"/);
  assert.doesNotMatch(deathWishPage, /Open embed/);

  const robuddy = manifest.find((item) => item.id === 'robuddy');
  assert.ok(robuddy);
  assert.equal(robuddy.embedIcon, 'sketchfab');
  const genericEmbed = manifest.find((item) => item.id === 'why-you-should-not-vibecode-your-portfolio');
  assert.ok(genericEmbed);
  assert.equal(genericEmbed.embedIcon, 'game');
  assert.match(
    fs.readFileSync(path.join(root, 'dist/p', genericEmbed.id, 'index.html'), 'utf8'),
    /assets\/icons\/game\.svg/
  );
});

function listJavaScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(filePath);
    return entry.isFile() && filePath.endsWith('.js') ? [filePath] : [];
  });
}
