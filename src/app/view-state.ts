import type { AppState, SavedFeedView } from './types.js';

const VIEW_STATE_KEY = 'portfolio-feed-view';

/** Preserves the current feed selection and position while the user visits an item page. */
export function saveViewState(state: Pick<AppState, 'activeTag' | 'cursor' | 'view'>): void {
    const savedView: SavedFeedView = {
        tag: state.activeTag,
        cursor: state.cursor,
        scrollY: window.scrollY,
        view: state.view
    };

    try {
        sessionStorage.setItem(VIEW_STATE_KEY, JSON.stringify(savedView));
    } catch (error) {
        // Returning to the feed still works if browser storage is unavailable.
    }
}

/** Restores and consumes a feed snapshot saved during the current tab session. */
export function loadSavedView(): SavedFeedView | null {
    try {
        const serializedView = sessionStorage.getItem(VIEW_STATE_KEY);
        if (!serializedView) return null;

        sessionStorage.removeItem(VIEW_STATE_KEY);
        return JSON.parse(serializedView) as SavedFeedView;
    } catch (error) {
        // A storage error or invalid snapshot should fall back to the default feed.
        return null;
    }
}
