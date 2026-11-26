/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import { marked } from 'marked';
import { prefixRootRelativeUrls, prefixSitePath } from './config';
import { addImageCaptions, darkenColor } from './template';
import { renderItemPage } from './pages';
import { parseFrontmatter } from '../shared/frontmatter';

export interface ManifestItem {
  id: string;
  type: 'work' | 'article';
  title: string;
  date: string;
  tags: string[];
  thumb: string;
  summary: string;
  url: string;
  embed: string;
  urlIcon: 'link' | 'itch';
  embedIcon: 'game' | 'itch' | 'sketchfab' | 'video';
  size?: 1 | 2 | 3;
  color?: string;
}

/** Builds standalone pages and manifest entries from Markdown content files. */
export function buildItemPages(template: string, version: string): ManifestItem[] {
  const markdownFiles = fs.existsSync('content')
    ? fs.readdirSync('content').filter((file) => file.endsWith('.md'))
    : [];
  const manifest: ManifestItem[] = [];

  for (const fileName of markdownFiles) {
    const itemId = path.basename(fileName, '.md');
    const markdown = fs.readFileSync(path.join('content', fileName), 'utf8');
    const { metadata, body } = parseFrontmatter(markdown);
    const item = createManifestItem(itemId, metadata);
    manifest.push(item);

    const renderedBody = prefixRootRelativeUrls(
      addImageCaptions(marked.parse(body, { async: false }) as string)
    );
    const pageHtml = renderItemPage(template, item, renderedBody, version);
    const itemDirectory = path.join('dist/p', itemId);

    fs.mkdirSync(itemDirectory, { recursive: true });
    fs.writeFileSync(path.join(itemDirectory, 'index.html'), pageHtml, 'utf8');
  }

  writePageColorStyles(manifest);
  return manifest;
}

/** Writes CSS rules for the background colors assigned to work pages. */
function writePageColorStyles(manifest: ManifestItem[]): void {
  const backgrounds = new Set(
    manifest.flatMap((item) =>
      item.type === 'work' && item.color ? [darkenColor(item.color)] : []
    )
  );
  const stylesheet = [...backgrounds].map((background) =>
    `.page-bg-${background.slice(1)} {\n  --page-bg: ${background};\n}`
  ).join('\n\n');
  const stylesheetPath = path.join('dist', 'styles', 'page-colors.css');

  fs.mkdirSync(path.dirname(stylesheetPath), { recursive: true });
  fs.writeFileSync(stylesheetPath, stylesheet, 'utf8');
}

/** Converts parsed frontmatter into the public manifest shape. */
function createManifestItem(itemId: string, metadata: Record<string, string>): ManifestItem {
  return {
    id: itemId,
    type: metadata.type === 'work' ? 'work' : 'article',
    title: metadata.title || itemId,
    date: metadata.date || '1970-01-01',
    tags: metadata.tags
      ? metadata.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [],
    thumb: prefixSitePath(metadata.thumb || ''),
    summary: metadata.summary || '',
    url: metadata.url || '',
    embed: metadata.embed || '',
    urlIcon: parseUrlIcon(metadata['url-icon']),
    embedIcon: parseEmbedIcon(metadata['embed-icon']),
    size: parseSize(metadata.size),
    color: parseColor(metadata.color)
  };
}

/** Returns a supported icon kind for an external URL, defaulting legacy entries to generic. */
function parseUrlIcon(value: string | undefined): 'link' | 'itch' {
  return value === 'itch' ? value : 'link';
}

/** Returns a supported icon kind for an embed, defaulting generic embeds to the game icon. */
function parseEmbedIcon(value: string | undefined): 'game' | 'itch' | 'sketchfab' | 'video' {
  return value === 'itch' || value === 'sketchfab' || value === 'video' ? value : 'game';
}

/** Returns a supported tile size from frontmatter, if present. */
function parseSize(value: string | undefined): 1 | 2 | 3 | undefined {
  if (value === '2') return 2;
  if (value === '3') return 3;
  return value === '1' ? 1 : undefined;
}

/** Accepts six-digit hexadecimal colors and ignores other values. */
function parseColor(value: string | undefined): string | undefined {
  const normalized = value?.trim() || '';
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : undefined;
}
