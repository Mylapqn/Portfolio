import { initializeFeed } from './app/feed.js';

// build.ts versions the entry URL; reuse that value when requesting the manifest.
const buildVersion = new URL(import.meta.url).searchParams.get('v') || '1';

initializeFeed(buildVersion);
