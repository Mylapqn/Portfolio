import { createCard } from './cards.js';
import { fetchText } from './manifest.js';
import { loadSavedView, saveViewState } from './view-state.js';
import { sitePath } from './site-path.js';
import type { AppState, PortfolioItem } from './types.js';

const TAG_LIMIT = 6;

/** Loads portfolio data and connects view selection, search, filters, and incremental rendering. */
export function initializeFeed(buildVersion: string): void {
    const params = new URLSearchParams(window.location.search);
    const state: AppState = {
        allItems: [],
        filteredItems: [],
        activeTag: 'ALL',
        cursor: 0,
        batchSize: 9,
        view: params.get('view') === 'blog' ? 'blog' : 'works',
        search: ''
    };

    const feed = document.getElementById('feed') as HTMLElement;
    const filters = document.getElementById('filters') as HTMLElement;
    const status = document.getElementById('status') as HTMLElement;
    const search = document.getElementById('search') as HTMLInputElement;
    const searchLabel = document.getElementById('search-label') as HTMLLabelElement;
    const hero = document.getElementById('hero') as HTMLElement;
    const heroImage = document.getElementById('hero-image') as HTMLImageElement;

    function updateUrl(tag: string): void {
        const nextParams = new URLSearchParams();
        if (state.view === 'blog') nextParams.set('view', 'blog');
        if (tag !== 'ALL') nextParams.set('tag', tag);
        const query = nextParams.toString();
        window.history.replaceState(null, '', `${sitePath('/')}${query ? `?${query}` : ''}`);
    }

    /** Creates at most six popular tag filters for the current feed view. */
    function buildTagFilters(): void {
        const counts = new Map<string, number>();
        for (const item of state.allItems) {
            if ((state.view === 'blog') !== (item.type === 'article')) continue;
            for (const tag of item.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
        }

        const rankedTags = Array.from(counts.entries())
            .sort((first, second) =>
                second[1] - first[1] || first[0].localeCompare(second[0], undefined, { sensitivity: 'base' })
            );
        const activeTagExists = state.activeTag !== 'ALL' &&
            rankedTags.some(([tag]) => tag === state.activeTag);
        const popularTags = rankedTags
            .filter(([tag]) => tag !== state.activeTag)
            .slice(0, activeTagExists ? TAG_LIMIT - 1 : TAG_LIMIT)
            .map(([tag]) => tag);
        if (activeTagExists) popularTags.push(state.activeTag);
        if (activeTagExists) {
            popularTags.sort((first, second) =>
                counts.get(second)! - counts.get(first)! ||
                first.localeCompare(second, undefined, { sensitivity: 'base' })
            );
        } else if (state.activeTag !== 'ALL') {
            state.activeTag = 'ALL';
        }

        filters.replaceChildren();
        for (const tagName of ['ALL', ...popularTags]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `filter-btn${tagName === state.activeTag ? ' active' : ''}`;
            button.textContent = tagName;
            button.setAttribute('aria-pressed', String(tagName === state.activeTag));
            button.addEventListener('click', () => applyFilter(tagName));
            filters.appendChild(button);
        }

    }

    /** Selects items in the current view and renders its initial depth. */
    function applyFilter(tag: string, initialItemCount = state.batchSize): void {
        state.activeTag = tag;
        state.cursor = 0;
        updateUrl(tag);
        state.filteredItems = state.allItems.filter((item) =>
            (state.view === 'blog' ? item.type === 'article' : item.type === 'work') &&
            (tag === 'ALL' || item.tags.includes(tag)) &&
            matchesSearch(item, state.search)
        );

        for (const child of Array.from(filters.children)) {
            const button = child as HTMLButtonElement;
            button.classList.toggle('active', button.textContent === tag);
            button.setAttribute('aria-pressed', String(button.textContent === tag));
        }

        feed.replaceChildren();
        feed.classList.toggle('feed--articles', state.view === 'blog');
        renderNextBatch(initialItemCount);
    }

    function matchesSearch(item: PortfolioItem, query: string): boolean {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        return !normalizedQuery ||
            `${item.title} ${item.summary}`.toLocaleLowerCase().includes(normalizedQuery);
    }

    /** Appends complete rows of works or a batch of article cards. */
    function renderNextBatch(batchSize = state.batchSize): void {
        if (state.cursor >= state.filteredItems.length) {
            status.textContent = state.filteredItems.length === 0 ? 'No items found.' : 'End of archive.';
            return;
        }

        const target = Math.min(state.cursor + batchSize, state.filteredItems.length);
        if (state.view === 'blog') {
            for (const item of state.filteredItems.slice(state.cursor, target)) {
                feed.appendChild(createCard(item, saveCurrentView));
            }
            state.cursor = target;
        } else {
            while (state.cursor < target) {
                const rowItems = nextWorkRow(state.filteredItems, state.cursor);
                const row = document.createElement('div');
                row.className = 'feed-row';
                for (const entry of rowItems) {
                    row.appendChild(createCard(entry.item, saveCurrentView, entry.columns));
                }
                feed.appendChild(row);
                state.cursor += rowItems.length;
            }
        }

        status.textContent =
            state.cursor < state.filteredItems.length ? 'Scroll for more...' : 'End of archive.';
        window.setTimeout(checkScroll, 60);
    }

    function nextWorkRow(items: PortfolioItem[], start: number): Array<{ item: PortfolioItem; columns: number }> {
        const current = items[start];
        const size = normalizedSize(current.size);
        const next = items[start + 1];
        const nextSize = next ? normalizedSize(next.size) : 0;

        if (size === 3) return [{ item: current, columns: 6 }];
        if (size === 2 && nextSize === 2) {
            return [{ item: current, columns: 3 }, { item: next, columns: 3 }];
        }
        if (size === 2 && nextSize === 1) {
            return [{ item: current, columns: 4 }, { item: next, columns: 2 }];
        }
        if (size === 1 && nextSize === 2) {
            return [{ item: current, columns: 2 }, { item: next, columns: 4 }];
        }
        if (size === 2) return [{ item: current, columns: 6 }];

        const row: Array<{ item: PortfolioItem; columns: number }> = [
            { item: current, columns: 2 }
        ];
        for (let index = start + 1; index < Math.min(start + 3, items.length); index++) {
            if (normalizedSize(items[index].size) !== 1) break;
            row.push({ item: items[index], columns: 2 });
        }
        return row;
    }

    function normalizedSize(size: number | undefined): number {
        return size === 2 || size === 3 ? size : 1;
    }

    function saveCurrentView(): void {
        saveViewState(state);
    }

    function checkScroll(): void {
        if (state.cursor >= state.filteredItems.length) return;
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 350) {
            renderNextBatch();
        }
    }

    function bindEvents(): void {
        let scrollDebounceTimer: number | undefined;
        window.addEventListener('scroll', () => {
            if (scrollDebounceTimer !== undefined) return;
            scrollDebounceTimer = window.setTimeout(() => {
                scrollDebounceTimer = undefined;
                checkScroll();
            }, 100);
        }, { passive: true });
        window.addEventListener('resize', checkScroll);
        search.addEventListener('input', () => {
            state.search = search.value;
            applyFilter(state.activeTag);
        });
    }

    bindEvents();
    fetchText(sitePath('/manifest.json?v=' + encodeURIComponent(buildVersion))).then(
        (manifestText) => {
            state.allItems = JSON.parse(manifestText) as PortfolioItem[];
            if (state.view === 'works') {
                const firstCover = state.allItems.find((item) => item.type === 'work' && item.thumb)?.thumb;
                if (firstCover) {
                    heroImage.src = firstCover;
                    heroImage.hidden = false;
                }
            } else {
                hero.classList.add('hero--blog');
                search.placeholder = 'Search articles...';
                searchLabel.textContent = 'Search articles';
                (document.getElementById('hero-title') as HTMLElement).textContent = 'Writing';
                (document.getElementById('hero-description') as HTMLElement).textContent =
                    'Notes, ideas and things I have learned along the way.';
            }

            const savedView = loadSavedView();
            const savedViewMatches = savedView &&
                (savedView.view || 'works') === state.view &&
                (!params.has('tag') || params.get('tag') === savedView.tag);
            if (savedViewMatches) {
                state.activeTag = savedView.tag;
                if (savedView.view === 'blog') {
                    hero.classList.add('hero--blog');
                    heroImage.hidden = true;
                    search.placeholder = 'Search articles...';
                    searchLabel.textContent = 'Search articles';
                    (document.getElementById('hero-title') as HTMLElement).textContent = 'Writing';
                    (document.getElementById('hero-description') as HTMLElement).textContent =
                        'Notes, ideas and things I have learned along the way.';
                }
            } else {
                state.activeTag = params.get('tag') || 'ALL';
            }

            for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-page]'))) {
                if (link.dataset.page === state.view) link.setAttribute('aria-current', 'page');
            }

            buildTagFilters();
            const initialCount = savedViewMatches
                ? savedView.cursor
                : state.batchSize;
            applyFilter(state.activeTag, initialCount);
            if (savedViewMatches) {
                window.setTimeout(() => window.scrollTo(0, savedView.scrollY), 20);
            }
        },
        (error: unknown) => {
            const detail = error instanceof Error ? ` ${error.message}` : '';
            status.textContent = `Failed to load portfolio manifest.${detail}`;
        }
    );
}
