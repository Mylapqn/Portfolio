# How the site works

The public portfolio is a static website. Source content and code live in the project; `dist/` is generated output that `npm run build` clears and recreates.

## Stack at a glance

- **Pages and styling:** HTML templates and modular CSS.
- **Browser behavior:** TypeScript compiled to native ES2022 JavaScript modules; no client-side framework or bundler.
- **Content:** Markdown files in `content/`, rendered with [`marked`](https://marked.js.org/).
- **Build and authoring:** Node.js scripts written in TypeScript and run with `tsx`; Studio's browser client is JavaScript with type checking enabled.
- **Dependencies and commands:** npm; see [Build and publish](./build-and-publish.md) and [Tests and checks](./testing.md).

## Folder map

| Location | Responsibility |
| --- | --- |
| `build.ts` | Entry point that coordinates a complete site build. |
| `build/` | Build modules: `assets.ts` prepares output, compiles the browser app, versions module imports, and copies assets; `content.ts` renders Markdown entries and creates manifest items; `pages.ts` creates standalone pages; `template.ts` provides token, HTML, and rendering helpers; `config.ts` handles site URLs and deployment paths. |
| `src/` | Source for the public site: page templates (`index.html`, `about.html`, `contact.html`, `item.html`), the browser entry point (`app.ts`) and its modules in `app/`, plus the stylesheet entry point and modular styles. |
| `shared/` | Small code used by both the build and Studio server. It currently contains the simple Markdown frontmatter parser. |
| `studio/` | The local content editor: `studio.ts` serves the editor and handles API requests, `client.js` runs the browser interface, and the HTML/CSS files define its UI. |
| `tests/` | Automated tests for parsing, templates, manifest validation, module URL versioning, and generated build output. See [Tests and checks](./testing.md) for what they cover and when to run them. |
| `content/` | Authored Markdown entries. Each filename without `.md` becomes an entry ID. |
| `assets/` | Source images and other static media copied into the generated site. |
| `dist/` | Generated, deployable output. Do not edit it by hand; rebuild it from source. |
| `docs/` | This developer wiki, starting at [Portfolio docs](./README.md). |

## Build flow

1. `npm run build` runs `build.ts` through `tsx`. The build creates a version identifier and clears `dist/`.
2. The build compiles the public TypeScript into native JavaScript modules. It adds the build version to local module imports so cached modules stay in step with the entry script.
3. Static media and styles are copied, and the Markdown entries in `content/` are parsed using the shared frontmatter helper and rendered into standalone pages with `marked`.
4. The build writes each entry to `dist/p/<id>/index.html`, creates `dist/manifest.json`, and fills the home, About, and Contact pages from their templates.
5. The browser app loads the manifest to display the Works and Blog feeds. Publish the contents of `dist/`. `SITE_BASE_PATH` controls the URL prefix: it defaults to empty in `build/config.ts`, while `.github/workflows/build-deploy-pages.yml` sets it to `/Portfolio` for GitHub Pages. `SITE_URL` separately controls canonical and social URLs. See [Build and publish](./build-and-publish.md) to configure these values.

The tests also run a build-output check using `/Portfolio`, so that test regenerates `dist/` with the project-site prefix. For test details and how to restore a root-path build, see [Tests and checks](./testing.md).

## Studio flow

Studio is a local authoring tool, separate from the public browser app. Run it with `npm run studio`. Its server reads and writes Markdown entries in `content/` and uploaded media in `assets/`. **Save** writes changes without rebuilding; **Save & Build** saves and then runs the site build. Dashboard build and FTP actions use already-saved content. See [Build and publish](./build-and-publish.md) and [Authoring content](./authoring.md).

## Public feed behavior

- The home page defaults to Works. `/?view=blog` selects articles; `?tag=<tag>` selects a tag.
- Search matches entry titles and summaries in the selected feed. Tag filters are based on the most-used tags in that feed, up to six, with an active tag retained when possible.
- Each feed initially targets nine entries. Article batches contain nine; the Works feed may show a few more to finish a complete row based on each entry's `size`. More entries load as the reader scrolls.
- Opening an entry saves the feed, tag, rendered item count, and scroll position in `sessionStorage`. Returning in the same tab restores that view when it still matches the URL.

For entry fields and image conventions, see [Authoring content](./authoring.md). For generated URLs and cache behavior, see [Build versions and browser caching](./versioning.md).
