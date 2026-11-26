/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { marked } from 'marked';

interface ManifestItem {
  id: string;
  type: 'work' | 'article';
  title: string;
  date: string;
  tags: string[];
  thumb: string;
  summary: string;
  url: string;
  embed: string;
  size?: 1 | 2 | 3;
  color?: string;
}

const SITE_URL = (process.env.SITE_URL || 'https://mylapqn.github.io/portfolio').replace(/\/+$/, '');
const SITE_ORIGIN = new URL(SITE_URL).origin;
const SITE_BASE_PATH = normalizeBasePath(process.env.SITE_BASE_PATH || '');
const SITE_NAME = 'Matouš Marek | Portfolio';

/** Coordinates the clean build from browser compilation through final page generation. */
function buildSite(): void {
  const version = String(Date.now());

  prepareOutputDirectory();
  compileBrowserApp();
  versionBrowserModuleImports(version);
  copyStaticAssets(version);

  const itemTemplate = fs.readFileSync('src/item.html', 'utf8');
  const manifest = buildItemPages(itemTemplate, version);
  buildStaticPages(version);

  manifest.sort(
    /** Keeps the newest portfolio entries at the front of the manifest. */
    (first, second) => first.date < second.date ? 1 : first.date > second.date ? -1 : 0
  );
  fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest, null, 2), 'utf8');

  const indexHtml = injectTokens(fs.readFileSync('src/index.html', 'utf8'), {
    VERSION: version,
    BASE_PATH: SITE_BASE_PATH,
    SITE_NAME: escapeHtml(SITE_NAME)
  });
  fs.writeFileSync('dist/index.html', indexHtml, 'utf8');

  console.log(`Built ${manifest.length} standalone pages into /dist (v=${version})`);
}

/** Starts each build with fresh output folders for pages and copied assets. */
function prepareOutputDirectory(): void {
  fs.rmSync('dist', { recursive: true, force: true });
  fs.mkdirSync('dist/p', { recursive: true });
  fs.mkdirSync('dist/assets', { recursive: true });
}

/** Emits the browser application using the project's browser TypeScript configuration. */
function compileBrowserApp(): void {
  execSync('npx tsc', { stdio: 'inherit' });
}

/** Adds the build identifier to module URLs so immutable browser caches cannot retain old code. */
function versionBrowserModuleImports(version: string): void {
  /** Finds emitted JavaScript modules throughout the compiler's output tree. */
  const listJavaScriptFiles = (directory: string): string[] =>
    fs.readdirSync(directory, { withFileTypes: true }).flatMap(
      /** Includes nested modules while excluding emitted directories and non-JS assets. */
      (entry) => {
        const filePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return listJavaScriptFiles(filePath);
        return entry.isFile() && filePath.endsWith('.js') ? [filePath] : [];
      }
    );
  const compiledFiles = ['dist/app.js', ...listJavaScriptFiles('dist/app')];
  const versionQuery = `?v=${encodeURIComponent(version)}`;

  for (const filePath of compiledFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    const versionedSource = source.replace(
      /(\bfrom\s*|\bimport\s*)(['"])([^'"]+\.js)\2/g,
      (
        _match: string,
        importKeyword: string,
        quote: string,
        modulePath: string
      ) => `${importKeyword}${quote}${modulePath}${versionQuery}${quote}`
    );
    fs.writeFileSync(filePath, versionedSource, 'utf8');
  }
}

/** Copies files that are shared by the generated pages rather than content-specific. */
function copyStaticAssets(version: string): void {
  if (fs.existsSync('assets')) {
    fs.cpSync('assets', 'dist/assets', { recursive: true });
  }
  fs.mkdirSync('dist/styles', { recursive: true });
  fs.cpSync('src/styles', 'dist/styles', { recursive: true });
  const stylesheet = fs
    .readFileSync('src/style.css', 'utf8')
    .replace(/\{\{VERSION\}\}/g, encodeURIComponent(version));
  fs.writeFileSync('dist/style.css', stylesheet, 'utf8');
  if (fs.existsSync('src/.htaccess')) {
    fs.copyFileSync('src/.htaccess', 'dist/.htaccess');
  }
}

/** Converts Markdown entries into standalone pages and returns their feed metadata. */
function buildItemPages(template: string, version: string): ManifestItem[] {
  const markdownFiles = fs.existsSync('content')
    ? fs.readdirSync('content').filter(
        /** Restricts page generation to authored Markdown content. */
        (file) => file.endsWith('.md')
      )
    : [];
  const manifest: ManifestItem[] = [];

  for (const fileName of markdownFiles) {
    const itemId = path.basename(fileName, '.md');
    const markdown = fs
      .readFileSync(path.join('content', fileName), 'utf8')
      .replace(/\r\n/g, '\n');
    const { metadata, body } = parseFrontmatter(markdown);

    const item: ManifestItem = {
      id: itemId,
      type: metadata.type === 'work' ? 'work' : 'article',
      title: metadata.title || itemId,
      date: metadata.date || '1970-01-01',
      tags: metadata.tags
        ? metadata.tags
            .split(',')
            .map(
              /** Normalizes each comma-separated tag before it enters the manifest. */
              (tag) => tag.trim()
            )
            .filter(Boolean)
        : [],
      thumb: prefixSitePath(metadata.thumb || ''),
      summary: metadata.summary || '',
      url: metadata.url || '',
      embed: metadata.embed || '',
      size: parseSize(metadata.size),
      color: parseColor(metadata.color)
    };

    manifest.push(item);

    const renderedBody = prefixRootRelativeUrls(
      addImageCaptions(marked.parse(body, { async: false }) as string)
    );
    const pageHtml = renderItemPage(template, item, renderedBody, version);

    const itemDirectory = path.join('dist/p', itemId);
    fs.mkdirSync(itemDirectory, { recursive: true });
    fs.writeFileSync(path.join(itemDirectory, 'index.html'), pageHtml, 'utf8');
  }

  return manifest;
}

/** Writes the lightweight About and Contact pages alongside project pages. */
function buildStaticPages(version: string): void {
  for (const page of ['about', 'contact']) {
    const template = fs.readFileSync(`src/${page}.html`, 'utf8');
    const html = injectTokens(template, {
      VERSION: version,
      BASE_PATH: SITE_BASE_PATH,
      SITE_NAME: escapeHtml(SITE_NAME)
    });
    const pageDirectory = path.join('dist', page);
    fs.mkdirSync(pageDirectory, { recursive: true });
    fs.writeFileSync(path.join(pageDirectory, 'index.html'), html, 'utf8');
  }
}

/** Fills an item template with metadata, rendered content, and optional embed/link sections. */
function renderItemPage(
  template: string,
  item: ManifestItem,
  contentHtml: string,
  version: string
): string {
  const canonicalUrl = `${SITE_URL}/p/${encodeURIComponent(item.id)}/`;
  const ogImageUrl = item.thumb.startsWith('/')
    ? `${SITE_ORIGIN}${item.thumb}`
    : item.thumb;
  const ogImageTag = item.thumb
    ? `<meta property="og:image" content="${escapeAttribute(ogImageUrl)}">`
    : '';

  const embedSection = item.embed
    ? `<div class="stage"><iframe src="${escapeAttribute(item.embed)}" frameborder="0" allowfullscreen="true"></iframe></div>`
    : '';

  const externalLink = item.url
    ? `<a class="btn" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">Open project &rarr;</a>`
    : '';
  const embedLink = item.embed
    ? `<a class="btn" href="${escapeAttribute(item.embed)}" target="_blank" rel="noopener noreferrer">Open embed &rarr;</a>`
    : '';

  const dateLabel = formatDate(item.date);
  const tagLinks = item.type === 'work'
    ? item.tags.map((tag) =>
        `<a class="tag-badge" href="${SITE_BASE_PATH}/?tag=${escapeAttribute(encodeURIComponent(tag))}">${escapeHtml(tag)}</a>`
      ).join('')
    : '';
  const workCover = item.type === 'work' && item.thumb
    ? `<div class="work-cover"><img src="${escapeAttribute(item.thumb)}" alt="${escapeAttribute(item.title)}"></div>`
    : '';
  const pageStyle = item.type === 'work' && item.color
    ? `--page-bg: ${escapeAttribute(darkenColor(item.color))};`
    : '';

  return injectTokens(template, {
    VERSION: version,
    BASE_PATH: SITE_BASE_PATH,
    SITE_NAME: escapeHtml(SITE_NAME),
    TITLE: escapeHtml(item.title),
    TITLE_ATTR: escapeAttribute(item.title),
    SUMMARY_ATTR: escapeAttribute(item.summary),
    CANONICAL_URL: escapeAttribute(canonicalUrl),
    OG_IMAGE: ogImageTag,
    PAGE_CLASS: item.type === 'work' ? 'work-page' : 'article-page',
    PAGE_STYLE: pageStyle,
    WORK_COVER_HTML: workCover,
    DATE_LABEL: escapeHtml(dateLabel),
    TAG_LINKS_HTML: tagLinks,
    EMBED_HTML: embedSection,
    EXTERNAL_LINK_HTML: externalLink,
    EMBED_LINK_HTML: embedLink,
    CONTENT: contentHtml
  });
}

function normalizeBasePath(value: string): string {
  const segments = value.split('/').filter(Boolean);
  if (segments.some((segment) => !/^[A-Za-z0-9._~-]+$/.test(segment) || segment === '.' || segment === '..')) {
    throw new Error(`Invalid SITE_BASE_PATH: ${value}`);
  }
  return segments.length ? `/${segments.join('/')}` : '';
}

function prefixSitePath(value: string): string {
  return SITE_BASE_PATH && value.startsWith('/') && !value.startsWith('//')
    ? `${SITE_BASE_PATH}${value}`
    : value;
}

function prefixRootRelativeUrls(html: string): string {
  if (!SITE_BASE_PATH) return html;
  return html.replace(
    /\b(src|href)=(["'])\/(?!\/)/gi,
    (_match, attribute: string, quote: string) => `${attribute}=${quote}${SITE_BASE_PATH}/`
  );
}

function parseSize(value: string | undefined): 1 | 2 | 3 | undefined {
  if (value === '2') return 2;
  if (value === '3') return 3;
  return value === '1' ? 1 : undefined;
}

function parseColor(value: string | undefined): string | undefined {
  const normalized = value?.trim() || '';
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : undefined;
}

function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function darkenColor(color: string): string {
  const channels = color.slice(1).match(/.{2}/g);
  if (!channels) return '#0d0f12';
  return `#${channels.map((channel) =>
    Math.round(parseInt(channel, 16) * 0.3).toString(16).padStart(2, '0')
  ).join('')}`;
}

/** Turns standard Markdown image paragraphs into full-width figures with centered captions. */
function addImageCaptions(html: string): string {
  return html.replace(/<p>(<img\b[^>]*>)<\/p>/g, (_match, imageTag: string) => {
    const alt = imageTag.match(/\balt="([^"]*)"/)?.[1];
    return `<figure>${imageTag}${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
  });
}

/** Replaces named template placeholders without interpreting replacement-string markers. */
function injectTokens(template: string, map: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(map)) {
    out = out.replace(
      new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
      /** Inserts user-facing values literally, including any `$&`-style text. */
      () => value
    );
  }
  return out;
}

/** Escapes text before inserting it into HTML content. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escapes text for use inside a quoted HTML attribute. */
function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

/** Separates the simple key/value header from a Markdown document's body. */
function parseFrontmatter(markdown: string): {
  metadata: Record<string, string>;
  body: string;
} {
  const metadata: Record<string, string> = {};
  if (!markdown.startsWith('---\n')) return { metadata, body: markdown };

  const headerEnd = markdown.indexOf('\n---\n', 4);
  if (headerEnd === -1) return { metadata, body: markdown };

  const frontmatter = markdown.slice(4, headerEnd);
  const body = markdown.slice(headerEnd + 5);

  for (const line of frontmatter.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    metadata[key] = value;
  }

  return { metadata, body };
}

buildSite();