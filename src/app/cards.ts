import type { PortfolioItem } from './types.js';
import { sitePath } from './site-path.js';

type PlatformIcon = 'link' | 'itch' | 'game' | 'sketchfab' | 'video';

interface PlatformDestination {
    icon: PlatformIcon;
}

/** Creates a feed card that links to its detail page while preserving native anchor behavior. */
export function createCard(
    item: PortfolioItem,
    saveFeedView: () => void,
    columns = 2
): HTMLElement {
    const itemPageUrl = sitePath(`/p/${encodeURIComponent(item.id)}/`);
    const card = document.createElement('article');
    card.className = `card card--${item.type}`;
    if (item.type === 'work') {
        card.style.gridColumn = `span ${columns}`;
        card.style.setProperty('--work-color', item.color || '#58a6ff');
        card.classList.add(`card--size-${item.size || 1}`);
    }

    if (item.thumb) {
        const media = document.createElement('div');
        media.className = 'card-media';

        const thumbnailLink = document.createElement('a');
        thumbnailLink.href = itemPageUrl;
        thumbnailLink.className = 'card-thumb-link';

        const thumbnail = document.createElement('img');
        thumbnail.className = 'card-thumb';
        thumbnail.src = item.thumb;
        thumbnail.alt = item.title;
        thumbnailLink.appendChild(thumbnail);
        media.appendChild(thumbnailLink);

        if (item.type === 'work') {
            const platformIcons = createPlatformIconRow(item);
            if (platformIcons) media.appendChild(platformIcons);
        }

        card.appendChild(media);
    }

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    if (item.type === 'work') {
        const titleLine = document.createElement('div');
        titleLine.className = 'card-title-line';
        const title = document.createElement('h2');
        title.appendChild(createTitleLink(item.title, itemPageUrl));
        const year = document.createElement('span');
        year.className = 'card-year';
        year.textContent = item.date.slice(0, 4);
        titleLine.append(title, year);
        cardBody.appendChild(titleLine);

        const summary = document.createElement('p');
        summary.className = 'card-summary';
        summary.textContent = item.summary;
        cardBody.appendChild(summary);
    } else {
        const title = document.createElement('h2');
        title.appendChild(createTitleLink(item.title, itemPageUrl));
        cardBody.appendChild(title);

        const summary = document.createElement('p');
        summary.textContent = item.summary;
        cardBody.appendChild(summary);

        const metadata = document.createElement('div');
        metadata.className = 'card-meta';
        metadata.textContent = item.date;
        cardBody.appendChild(metadata);
    }

    card.appendChild(cardBody);

    card.addEventListener('click', (event) => {
        saveFeedView();
        if (
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.button === 1 ||
            (event.target instanceof Element && event.target.closest('a'))
        ) return;
        window.location.href = itemPageUrl;
    });

    return card;
}

/** Creates non-interactive platform markers for a work thumbnail. */
function createPlatformIconRow(item: PortfolioItem): HTMLElement | null {
    const destinations = collectPlatformDestinations(item);
    if (!destinations.length) return null;

    const row = document.createElement('div');
    row.className = 'platform-icons';
    row.setAttribute('role', 'img');
    row.setAttribute(
        'aria-label',
        `Project platforms: ${destinations.map(({ icon }) => platformLabel(icon)).join(', ')}`
    );

    for (const { icon } of destinations) {
        const marker = document.createElement('span');
        marker.className = 'platform-marker';

        const image = document.createElement('img');
        image.className = 'platform-icon';
        image.src = sitePath(`/assets/icons/${icon}.svg`);
        image.alt = '';

        const fallback = document.createElement('span');
        fallback.className = 'platform-icon-fallback';
        fallback.textContent = platformFallback(icon);
        fallback.hidden = true;
        image.addEventListener('error', () => {
            image.hidden = true;
            fallback.hidden = false;
        }, { once: true });

        marker.append(image, fallback);
        row.appendChild(marker);
    }

    return row;
}

/** Collects one marker for each distinct link and embed icon kind. */
function collectPlatformDestinations(item: PortfolioItem): PlatformDestination[] {
    const destinations: PlatformDestination[] = [];
    const seen = new Set<PlatformIcon>();
    const add = (icon: PlatformIcon): void => {
        if (seen.has(icon)) return;
        seen.add(icon);
        destinations.push({ icon });
    };

    if (item.url) add(item.urlIcon || 'link');
    if (item.embed) add(item.embedIcon || 'game');

    return destinations;
}

/** Provides an accessible action label for a platform marker. */
function platformLabel(icon: PlatformIcon): string {
    switch (icon) {
        case 'itch': return 'itch.io';
        case 'game': return 'Game embed';
        case 'sketchfab': return 'Sketchfab';
        case 'link': return 'Generic link';
        case 'video': return 'Video';
    }
}

/** Provides a compact label when the corresponding SVG is not present. */
function platformFallback(icon: PlatformIcon): string {
    switch (icon) {
        case 'itch': return 'ITCH';
        case 'game': return 'GAME';
        case 'sketchfab': return '3D';
        case 'link': return 'LINK';
        case 'video': return 'VIDEO';
    }
}

function createTitleLink(title: string, href: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = title;
    return link;
}
