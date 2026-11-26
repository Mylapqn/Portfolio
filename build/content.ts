/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import { marked } from 'marked';
import { prefixRootRelativeUrls, prefixSitePath } from './config';
import { addImageCaptions } from './template';
import { renderItemPage } from './pages';

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
    const markdown = fs
      .readFileSync(path.join('content', fileName), 'utf8')
      .replace(/\r\n/g, '\n');
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

  return manifest;
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
    size: parseSize(metadata.size),
    color: parseColor(metadata.color)
  };
}

/** Reads the simple key/value header used by portfolio Markdown files. */
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
