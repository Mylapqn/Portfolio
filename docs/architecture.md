# How the site works

The public portfolio is a static website. Source content and code live in the project; `dist/` is generated output, cleared and rebuilt by `npm run build`.

## Stack at a glance

- **Pages and styling:** HTML templates and modular CSS.
- **Browser behavior:** TypeScript compiled to native JavaScript modules; no client-side framework.
- **Content:** Markdown files in `content/`, rendered with [`marked`](https://marked.js.org/).
- **Build and authoring:** Node.js scripts written in TypeScript and run with `tsx`; Studio's browser client is JavaScript.
- **Dependencies and commands:** npm; see [Build and publish](./build-and-publish.md).

## From source to site

1. Each `content/<id>.md` supplies one entry. The filename without `.md` is its ID.
2. `build.ts` parses the simple frontmatter, renders the Markdown body, and fills `src/item.html`.
3. Each entry becomes `dist/p/<id>/index.html`; its metadata also goes into `dist/manifest.json`.
4. The browser app reads the manifest to create the Works and Blog feeds.
5. The build compiles the browser TypeScript, fills the home/About/Contact templates, and copies assets and styles into `dist/`.
6. Publish the contents of `dist/`; do not change generated files by hand.

## Main source locations

| Location | Responsibility |
| --- | --- |
| `content/` and `assets/` | Markdown entries and their images/media |
| `build.ts` | Generates the static pages and manifest |
| `src/index.html`, `src/item.html`, `src/about.html`, `src/contact.html` | Page templates |
| `src/app.ts`, `src/app/` | Browser entry point, feed, cards, data types, and saved view state |
| `src/style.css`, `src/styles/` | Public stylesheet entry point and modular styles |
| `studio/studio.ts`, `studio/client.js`, `studio/index.html` | Local editor server, browser UI, and template |
| `studio/studio.css`, `studio/studio-*.css` | Studio stylesheet entry point and modular styles |
| `docs/` | Short developer wiki |

## Feed behavior

- The home page defaults to Works. `/?view=blog` selects articles; `?tag=<tag>` selects a tag.
- Search matches entry titles and summaries in the selected feed. Tag filters are based on the most-used tags in that feed, up to six, with an active tag retained when possible.
- Each feed initially targets nine entries. Article batches contain nine; the Works feed may show a few more to finish a complete row based on each entry's `size`. More entries load as the reader scrolls.
- Opening an entry saves the feed, tag, rendered item count, and scroll position in `sessionStorage`. Returning in the same tab restores that view when it still matches the URL.

For entry fields and image conventions, see [Authoring content](./authoring.md). For generated URLs and cache behavior, see [Build versions and browser caching](./versioning.md).
