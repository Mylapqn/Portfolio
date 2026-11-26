/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import { SITE_BASE_PATH, SITE_NAME, SITE_ORIGIN, SITE_URL } from './config';
import type { ManifestItem } from './content';
import {
  darkenColor,
  escapeAttribute,
  escapeHtml,
  formatDate,
  injectTokens
} from './template';

/** Writes the static About and Contact pages. */
export function buildStaticPages(version: string): void {
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

/** Fills an item template with metadata and its optional media and link sections. */
export function renderItemPage(
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
    DATE_LABEL: escapeHtml(formatDate(item.date)),
    TAG_LINKS_HTML: tagLinks,
    EMBED_HTML: embedSection,
    EXTERNAL_LINK_HTML: externalLink,
    EMBED_LINK_HTML: embedLink,
    CONTENT: contentHtml
  });
}
