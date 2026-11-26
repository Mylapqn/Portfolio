export interface PortfolioItem {
    id: string;
    type: 'work' | 'article';
    title: string;
    date: string;
    tags: string[];
    thumb: string;
    summary: string;
    url: string;
    embed: string;
    urlIcon?: 'link' | 'itch';
    embedIcon?: 'game' | 'itch' | 'sketchfab' | 'video';
    size?: 1 | 2 | 3;
    color?: string;
}

export interface SavedFeedView {
    tag: string;
    cursor: number;
    scrollY: number;
    view?: 'works' | 'blog';
}

export interface AppState {
    allItems: PortfolioItem[];
    filteredItems: PortfolioItem[];
    activeTag: string;
    /** Number of filtered items already rendered in the feed. */
    cursor: number;
    batchSize: number;
    view: 'works' | 'blog';
    search: string;
}
