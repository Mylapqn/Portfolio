import type { PortfolioItem } from './types.js';
import { sitePath } from './site-path.js';

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
        const thumbnailLink = document.createElement('a');
        thumbnailLink.href = itemPageUrl;
        thumbnailLink.className = 'card-thumb-link';

        const thumbnail = document.createElement('img');
        thumbnail.className = 'card-thumb';
        thumbnail.src = item.thumb;
        thumbnail.alt = item.title;
        thumbnailLink.appendChild(thumbnail);
        card.appendChild(thumbnailLink);
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

function createTitleLink(title: string, href: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = title;
    return link;
}
