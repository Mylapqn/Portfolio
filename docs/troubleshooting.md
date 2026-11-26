# Troubleshooting

## An entry is missing from the feed

- Confirm its file is in `content/` and ends in `.md`.
- Check the frontmatter delimiters: `---` must be on its own line at the beginning and end of the header.
- Run `npm run build` and check for the entry in `dist/manifest.json`.
- Only `type: work` becomes a Work entry; every other or missing type becomes an article.

## An image or link is broken

- Confirm the image exists under `assets/` and use a public path such as `/assets/my-image.webp`, not a Windows disk path.
- Run `npm run build` after adding or changing files.
- If an image was replaced but still looks unchanged, use a new filename and update the Markdown reference; authored image URLs are not build-versioned.
- For a project-site deployment, confirm `SITE_BASE_PATH` matches the deployed path.

## The browser shows old code or content

Rebuild and deploy the complete contents of `dist/`, including nested JavaScript modules. Script and stylesheet URLs are versioned on each build; see [Build versions and browser caching](./versioning.md). For images, use a new filename when replacing an asset.

## Studio cannot start, build, or upload

- Studio uses port `4173` by default. Set `STUDIO_PORT` if that port is occupied.
- Studio binds to `127.0.0.1`; access it at <http://localhost:4173/>.
- For FTP, confirm `FTP_HOST`, `FTP_USER`, and `FTP_PASS` are set in the same terminal session. `FTP_DIR` defaults to `/public_html`.
- Confirm the system `curl` command is available for FTP publishing.
- Use **Build Content** to test a local build without FTP.

## TypeScript or build errors

Run `npm run typecheck` to check the browser and Node TypeScript projects, then `npm run build` to reproduce the site build. If dependencies are missing after a fresh checkout, run `npm ci`.
