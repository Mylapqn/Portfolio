# Build and publish

## Build locally

For a fresh checkout, install the locked dependencies:

```powershell
npm ci
```

Then check the TypeScript and generate the site:

```powershell
npm run typecheck
npm run build
```

`npm run build` runs `build.ts`. It clears and recreates `dist/`, compiles the browser app, copies assets and styles, generates a page for each Markdown entry, and writes the home page and manifest. Never keep source files in `dist/`.

Check `dist/index.html`, `dist/manifest.json`, and `dist/p/<id>/index.html` for the expected output. There is no separate test script; use the relevant typecheck/build command.

## Deployment paths and URLs

- `SITE_BASE_PATH` sets the site's path prefix. It defaults to empty for a web-root deployment; set it to `/portfolio` for the `mylapqn.github.io/portfolio` project site.
- `SITE_URL` sets the public base URL used for canonical and social URLs. It defaults to `https://mylapqn.github.io/portfolio`.

Set these in the build environment when deploying to a different path or domain. `SITE_URL` and `SITE_BASE_PATH` serve different purposes; for the GitHub project site, the defaults for `SITE_URL` do not automatically set `SITE_BASE_PATH`.

## Publish with GitHub Actions

The workflow in `.github/workflows/build-deploy-pages.yml` typechecks and builds the site on pushes and pull requests targeting `main`. It sets `SITE_BASE_PATH=/portfolio`, packages `dist/` as a Pages artifact, and deploys it to GitHub Pages after successful pushes to `main` (or a manual run on `main`). Pull requests run the build but do not deploy.

In the repository's **Settings → Pages**, select **GitHub Actions** as the build and deployment source. The workflow needs the repository's Pages deployment permissions enabled. Once configured, pushes to `main` publish to <https://mylapqn.github.io/portfolio/>.

## Publish with Studio

Run `npm run studio` and open <http://localhost:4173/>. Studio is a local tool bound to `127.0.0.1` (default port `4173`; override with `STUDIO_PORT`).

- **Save** writes the current entry and uploaded images, without rebuilding.
- **Save & Build** saves the current entry, then builds locally.
- **Build Content** builds already-saved content and assets.
- **Build & Push to FTP** builds saved content, then uploads `dist/`; it does not save unsaved editor changes.

For the Markdown format and Studio editing steps, see [Authoring content](./authoring.md).

## FTP or manual publishing

Studio FTP publishing requires `FTP_HOST`, `FTP_USER`, and `FTP_PASS`. `FTP_DIR` is optional and defaults to `/public_html`. Set the variables in the same terminal session that runs Studio:

```powershell
$env:FTP_HOST = "your-ftp-host"
$env:FTP_USER = "your-ftp-user"
$env:FTP_PASS = "your-password"
$env:FTP_DIR = "/public_html"
npm run studio
```

FTP upload uses the machine's `curl` command and creates remote directories as needed. Never commit real credentials.

For manual deployment, upload the complete **contents** of `dist/` to the corresponding web root, preserving subfolders. Deploy the full output together, not just changed files.
