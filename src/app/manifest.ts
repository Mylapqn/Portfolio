import type { PortfolioItem } from './types.js';

/**
 * Fetches and validates the portfolio manifest.
 */
export async function fetchManifest(url: string): Promise<PortfolioItem[]> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
    }

    return parseManifest(await response.text());
}

/** Parses manifest JSON and rejects entries that do not match the feed data shape. */
export function parseManifest(json: string): PortfolioItem[] {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) {
        throw new Error('Portfolio manifest must be an array.');
    }

    const items: PortfolioItem[] = [];
    for (const [index, item] of data.entries()) {
        if (!isPortfolioItem(item)) {
            throw new Error(`Portfolio manifest entry ${index + 1} is invalid.`);
        }
        items.push(item);
    }

    return items;
}

/** Checks the fields consumed by the portfolio feed. */
function isPortfolioItem(value: unknown): value is PortfolioItem {
    if (!isRecord(value)) return false;
    const item = value;

    return typeof item.id === 'string' &&
        (item.type === 'work' || item.type === 'article') &&
        typeof item.title === 'string' &&
        typeof item.date === 'string' &&
        Array.isArray(item.tags) &&
        item.tags.every((tag: unknown) => typeof tag === 'string') &&
        typeof item.thumb === 'string' &&
        typeof item.summary === 'string' &&
        typeof item.url === 'string' &&
        typeof item.embed === 'string' &&
        (item.size === undefined || item.size === 1 || item.size === 2 || item.size === 3) &&
        (item.color === undefined || typeof item.color === 'string');
}

/** Narrows JSON objects to string-keyed records for field validation. */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
