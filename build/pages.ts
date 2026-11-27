/// <reference types="node" />

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    prefixSitePath,
    SITE_BASE_PATH,
    SITE_NAME,
    SITE_ORIGIN,
    SITE_URL
} from './config';
import type { ManifestItem } from './content';
import {
    darkenColor,
    escapeAttribute,
    escapeHtml,
    formatDate,
    injectTokens
} from './template';

/** Writes the static About and Contact pages. */
export function buildStaticPages(version: string, navTemplate: string): void {
    for (const page of ['about', 'contact'] as const) {
        const template = fs.readFileSync(`src/${page}.html`, 'utf8');
        const html = injectTokens(template, {
            VERSION: version,
            BASE_PATH: SITE_BASE_PATH,
            SITE_NAME: escapeHtml(SITE_NAME),
            SITE_NAV: renderSiteNav(navTemplate, page)
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
    version: string,
    navTemplate: string
): string {
    const canonicalUrl = `${SITE_URL}/p/${encodeURIComponent(item.id)}/`;
    const ogImageUrl = item.thumb.startsWith('/')
        ? `${SITE_ORIGIN}${item.thumb}`
        : item.thumb;
    const ogImageTag = item.thumb
        ? `<meta property="og:image" content="${escapeAttribute(ogImageUrl)}">`
        : '';
    const embedSection = item.embed
        ? `<div class="stage"><iframe src="${escapeAttribute(item.embed)}" title="Embedded portfolio project" allowfullscreen></iframe></div>`
        : '';
    const externalLink = item.url
        ? `<a class="btn" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener noreferrer">${renderIconMarker(item.urlIcon || 'link', 'button-icon')}${externalLinkLabel(item.urlIcon)}</a>`
        : '';
    const tagLinks = item.type === 'work'
        ? item.tags.map((tag) =>
            `<a class="filter-btn" href="${SITE_BASE_PATH}/?tag=${escapeAttribute(encodeURIComponent(tag))}">${escapeHtml(tag)}</a>`
        ).join('')
        : '';
    const workCover = item.type === 'work' && item.thumb
        ? `<div class="work-cover"><img src="${escapeAttribute(item.thumb)}" alt="${escapeAttribute(item.title)}"></div>`
        : '';
    const pageColorClass = item.type === 'work' && item.color
        ? ` page-bg-${item.color.slice(1)}`
        : '';

    return injectTokens(template, {
        VERSION: version,
        BASE_PATH: SITE_BASE_PATH,
        SITE_NAME: escapeHtml(SITE_NAME),
        SITE_NAV: renderSiteNav(navTemplate, 'item', true),
        TITLE: escapeHtml(item.title),
        TITLE_ATTR: escapeAttribute(item.title),
        SUMMARY_ATTR: escapeAttribute(item.summary),
        CANONICAL_URL: escapeAttribute(canonicalUrl),
        OG_IMAGE: ogImageTag,
        PAGE_CLASS: `${item.type === 'work' ? 'work-page' : 'article-page'}${pageColorClass}`,
        WORK_COVER_HTML: workCover,
        DATE_LABEL: escapeHtml(formatDate(item.date)),
        TAG_LINKS_HTML: tagLinks,
        EMBED_HTML: embedSection,
        EXTERNAL_LINK_HTML: externalLink,
        CONTENT: contentHtml
    });
}

/** Renders the shared navigation with page-specific state and styling. */
export function renderSiteNav(
    template: string,
    page: 'home' | 'about' | 'contact' | 'item',
    useBackdropBlur: boolean = false
): string {
    return injectTokens(template, {
        BASE_PATH: SITE_BASE_PATH,
        NAV_CLASS: useBackdropBlur ? 'backdrop-blur' : '',
        WORKS_ATTRIBUTES: page === 'home' ? 'data-page="works"' : '',
        BLOG_ATTRIBUTES: page === 'home' ? 'data-page="blog"' : '',
        ABOUT_ATTRIBUTES: page === 'about' ? 'aria-current="page"' : '',
        CONTACT_ATTRIBUTES: page === 'contact' ? 'aria-current="page"' : ''
    });
}

/** Renders a decorative icon and text fallback for a URL button or embed stage. */
function renderIconMarker(
    icon: 'link' | 'itch' | 'game' | 'sketchfab' | 'video',
    className: string
): string {
    const fallbacks = {
        link: 'LINK',
        itch: 'ITCH',
        game: 'GAME',
        sketchfab: '3D',
        video: 'VIDEO'
    } as const;
    const iconPath = prefixSitePath(`/assets/icons/${icon}.svg`);
    return `<span class="destination-marker ${className}" aria-hidden="true"><img class="destination-icon" src="${escapeAttribute(iconPath)}" alt=""><span class="destination-icon-fallback" hidden>${fallbacks[icon]}</span></span>`;
}

/** Returns the label for an external URL button based on its type. */
function externalLinkLabel(icon: 'link' | 'itch'): string {
    return icon === 'itch' ? 'View on itch.io' : 'View external link';
}