# Portfolio docs

Start here when returning to the project. This short wiki explains how the site is organized, how to edit it, and how to build and publish it.

## Quick start

Run these commands from the project root:

```powershell
npm ci                 # fresh checkout only
npm test
npm run typecheck
npm run build
npm run dev
npm run studio
```

Studio opens at <http://localhost:4173/>. **Save** writes the current entry and uploaded images; **Save & Build** also rebuilds the site. Dashboard build and FTP actions use already-saved content.

For a live public-site preview, run `npm run dev` and open <http://localhost:4174/>. It serves `dist/`, rebuilds when source CSS, HTML, or TypeScript changes, and reloads the browser after each successful build. Stop it with Ctrl+C.

## Find your way

- [How the site works](./architecture.md) — source files, tech stack, and page/feed behavior.
- [Authoring content](./authoring.md) — Markdown format, Studio, and image paths.
- [Tests and checks](./testing.md) — what automated tests cover, when to run them, and how to read failures.
- [Build and publish](./build-and-publish.md) — local commands, deployment settings, and FTP.
- [Build versions and browser caching](./versioning.md) — cache behavior and asset updates.
- [Troubleshooting](./troubleshooting.md) — common content, build, and Studio problems.
- [Personal backlog](./todo.md) — high-level design and project tasks to track.
