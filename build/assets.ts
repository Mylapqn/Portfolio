/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { SITE_BASE_PATH } from './config';
import { injectTokens } from './template';

/** Clears and recreates the generated output folders. */
export function prepareOutputDirectory(): void {
  fs.rmSync('dist', { recursive: true, force: true });
  fs.mkdirSync('dist/p', { recursive: true });
  fs.mkdirSync('dist/assets', { recursive: true });
}

/** Emits the browser application using the project's browser TypeScript configuration. */
export function compileBrowserApp(): void {
  execSync('npx tsc', { stdio: 'inherit' });
}

/** Adds a build identifier to emitted module imports to refresh browser caches. */
export function versionBrowserModuleImports(version: string): void {
  const compiledFiles = ['dist/app.js', ...listJavaScriptFiles('dist/app')];

  for (const filePath of compiledFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, addVersionToModuleImports(source, version), 'utf8');
  }
}

/** Adds the build version to local JavaScript module specifiers in compiler output. */
export function addVersionToModuleImports(source: string, version: string): string {
  const versionQuery = `?v=${encodeURIComponent(version)}`;
  return source.replace(
    /(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])([^'"]+\.js)\2/g,
    (
      match: string,
      importKeyword: string,
      quote: string,
      modulePath: string
    ) => modulePath.startsWith('.')
      ? `${importKeyword}${quote}${modulePath}${versionQuery}${quote}`
      : match
  );
}

/** Copies shared images, stylesheets, and server configuration into the output. */
export function copyStaticAssets(version: string): void {
  if (fs.existsSync('assets')) {
    fs.cpSync('assets', 'dist/assets', { recursive: true });
  }
  fs.mkdirSync('dist/styles', { recursive: true });
  fs.cpSync('src/styles', 'dist/styles', { recursive: true });

  const stylesheet = injectTokens(fs.readFileSync('src/style.css', 'utf8'), {
    VERSION: encodeURIComponent(version),
    BASE_PATH: SITE_BASE_PATH
  });
  fs.writeFileSync('dist/style.css', stylesheet, 'utf8');

  if (fs.existsSync('src/.htaccess')) {
    fs.copyFileSync('src/.htaccess', 'dist/.htaccess');
  }
}

/** Recursively finds emitted JavaScript modules in the compiler output. */
function listJavaScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(filePath);
    return entry.isFile() && filePath.endsWith('.js') ? [filePath] : [];
  });
}
