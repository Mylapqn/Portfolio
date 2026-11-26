# Build versions and browser caching

The build creates a cache-busting version value automatically. It is not a release number and is not edited by hand.

## What receives the version

At the start of each build, `build.ts` uses `String(Date.now())`. That value is added to:

- The public stylesheet and page-entry script URLs.
- Imports between compiled browser JavaScript modules.
- The browser app's `manifest.json` request.

The manifest itself has no version field. The version is in the request URL, for example `manifest.json?v=...`.

## Cache behavior

The generated `.htaccess` sets HTML and JSON to no-cache/no-store, and gives JavaScript, CSS, and selected media/font formats a one-year immutable cache policy. The versioned URLs let the browser fetch new scripts and styles after a build.

Image URLs in authored content are **not** versioned automatically. When replacing an image, use a new filename and update its Markdown reference so browsers request a new URL. After changing code or content, rebuild and deploy the complete `dist/` output. See [Build and publish](./build-and-publish.md).
