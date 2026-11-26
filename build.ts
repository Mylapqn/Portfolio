/// <reference types="node" />

import * as fs from 'node:fs';
import { SITE_BASE_PATH, SITE_NAME } from './build/config';
import {
  compileBrowserApp,
  copyStaticAssets,
  prepareOutputDirectory,
  versionBrowserModuleImports
} from './build/assets';
import { buildItemPages } from './build/content';
import { buildStaticPages } from './build/pages';
import { escapeHtml, injectTokens } from './build/template';

/** Builds the static site from source templates, content, and assets. */
function buildSite(): void {
  const version = String(Date.now());

  prepareOutputDirectory();
  compileBrowserApp();
  versionBrowserModuleImports(version);
  copyStaticAssets(version);

  const itemTemplate = fs.readFileSync('src/item.html', 'utf8');
  const manifest = buildItemPages(itemTemplate, version);
  buildStaticPages(version);

  manifest.sort((first, second) => {
    if (first.date === second.date) return 0;
    return first.date > second.date ? -1 : 1;
  });
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2), 'utf8');

  const indexHtml = injectTokens(fs.readFileSync('src/index.html', 'utf8'), {
    VERSION: version,
    BASE_PATH: SITE_BASE_PATH,
    SITE_NAME: escapeHtml(SITE_NAME)
  });
  fs.writeFileSync('dist/index.html', indexHtml, 'utf8');

  console.log(`Built ${manifest.length} standalone pages into /dist (v=${version})`);
}

buildSite();
