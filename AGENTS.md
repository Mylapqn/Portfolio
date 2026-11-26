# Project instructions

## Project and audience

- This is a personal portfolio for a 3D artist and game developer.
- Build for both desktop and mobile, using a desktop-first approach.
- Keep the site and Studio understandable for a developer who may edit the HTML, CSS, TypeScript, and Markdown directly.

## Technology stack

- The public site is a static website built from HTML, CSS, and a TypeScript browser app. It has no client-side framework.
- Portfolio entries are authored as Markdown files in `content/`. `build.ts` uses Node.js, TypeScript via `tsx`, and `marked` to generate the pages and manifest in `dist/`.
- The Studio tool is a local content editor: its browser interface uses JavaScript, and its Node.js server/build integration is TypeScript.
- npm manages dependencies and project commands. `npm run typecheck` checks the browser and Node TypeScript projects; `npm run build` generates the site; `npm run studio` starts Studio.
- Treat `dist/` as generated output. Make changes in source files and rebuild rather than editing generated files.

## Code and implementation

- Favor clear, human-readable code and straightforward solutions over clever or unnecessarily abstract ones.
- Give top-level functions clear, legible JSDoc that explains their purpose.
- Add brief comments when code uses an external API, an uncommon feature, or a less familiar JavaScript, TypeScript, or web-platform practice. Avoid comments that merely repeat the code.
- Split TypeScript and CSS files into logical modules when they become difficult to navigate. Keep related functionality together; do not create tiny files for individual functions or classes.
- Preserve existing behavior and follow the project's patterns when changing code.

## Documentation

- `docs/` is the project's concise, interlinked developer wiki and the starting point for returning developers. Read its relevant pages before making changes.
- Keep documentation brief, clear, and factual. It explains how and why the portfolio is structured, how to author content with Studio or directly, and how to build and publish.
- For major changes to functionality or user interaction, update the relevant `docs/` pages so they describe the current behavior and steps accurately.

## Validation

- Prefer the smallest relevant existing check, such as `npm run typecheck` or `npm run build`.
- Keep validation simple and fast. Do not use Python or large one-off scripts just to check a website change.
