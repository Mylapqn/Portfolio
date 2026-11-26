# Build and publish

## Build locally

For a fresh checkout, install the locked dependencies:

```powershell
npm ci
```

Then check the TypeScript and generate the site:

```powershell
npm run test
npm run typecheck
npm run build
```

`npm run build` runs `build.ts`, which coordinates the focused modules in `build/`. It clears and recreates `dist/`, compiles the browser app, copies assets and styles, generates a page for each Markdown entry, and writes the home page and manifest. Studio uses this same npm command when building. Never keep source files in `dist/`.

The test command checks build helpers and builds a `/Portfolio`-prefixed site to verify generated output and versioned module imports. Check `dist/index.html`, `dist/manifest.json`, and `dist/p/<id>/index.html` for the expected output.

For what the checks cover, when to run them, and how to interpret failures, see [Tests and checks](./testing.md).

## Build configuration

`npm run build` reads these environment variables; their defaults are defined in [`build/config.ts`](../build/config.ts):

| Variable | Default | What it controls |
| --- | --- | --- |
| `SITE_BASE_PATH` | Empty | Prefix for site-relative URLs. Use `/Portfolio` when deploying to this repository's GitHub Pages project site. Leave it empty when the site is served from a domain root, such as `https://example.com/`. |
| `SITE_URL` | `https://mylapqn.github.io/Portfolio` | The full public site URL used to make canonical and social metadata. This does not set the URL prefix; configure `SITE_BASE_PATH` separately. |

The [GitHub Actions workflow](../.github/workflows/build-deploy-pages.yml) sets both variables in its build step: `SITE_BASE_PATH=/Portfolio` and `SITE_URL=https://mylapqn.github.io/Portfolio`. For local builds, set them in PowerShell before building:

```powershell
# Build for this repository's GitHub Pages project site
$env:SITE_BASE_PATH = "/Portfolio"
$env:SITE_URL = "https://mylapqn.github.io/Portfolio"
npm run build
```

For a domain-root deployment, use an empty `SITE_BASE_PATH` and your site's public URL:

```powershell
$env:SITE_BASE_PATH = ""
$env:SITE_URL = "https://example.com"
npm run build
```

PowerShell environment values remain set in that terminal session. A normal local build with both variables unset uses the defaults in the table: root-relative paths, but GitHub Pages canonical/social URLs.

## Publish with GitHub Actions

The [workflow](../.github/workflows/build-deploy-pages.yml) uses Node.js 26.13.1 LTS, pinned in [`.nvmrc`](../.nvmrc), to test, typecheck, and build the site on pushes and pull requests targeting `main`. It sets `SITE_BASE_PATH=/Portfolio`, packages `dist/` as a Pages artifact, and deploys it to GitHub Pages after successful pushes to `main` (or a manual run on `main`). Pull requests run the build but do not deploy. Use the same pinned Node.js release locally for consistent builds.

In the repository's **Settings → Pages**, select **GitHub Actions** as the build and deployment source. The workflow needs the repository's Pages deployment permissions enabled. Once configured, pushes to `main` publish to <https://mylapqn.github.io/Portfolio/>.

## Publish with Studio

Run `npm run studio` and open <http://localhost:4173/>. Studio is a local tool bound to `127.0.0.1` (default port `4173`; override with `STUDIO_PORT`).

- **Save** writes the current entry and uploaded images, without rebuilding.
- **Save & Build** saves the current entry, then builds locally.
- **Build Content** builds already-saved content and assets.
- **Build & Push to FTP** builds saved content, then uploads `dist/`; it does not save unsaved editor changes.

Studio's build buttons inherit `SITE_BASE_PATH` and `SITE_URL` from the terminal that launched Studio. `STUDIO_PORT` only changes Studio's local listening port; it does not affect the published site.

For the Markdown format and Studio editing steps, see [Authoring content](./authoring.md).

## FTP or manual publishing

These variables are used only by Studio's **Build & Push to FTP** action, not by a normal `npm run build`:

| Variable | Default | What it controls |
| --- | --- | --- |
| `FTP_HOST` | Empty | FTP server host. Required for upload. |
| `FTP_USER` | Empty | FTP account name. Required for upload. |
| `FTP_PASS` | Empty | FTP password. Required for upload. |
| `FTP_DIR` | `/public_html` | Remote directory to receive the contents of `dist/`. |

Set the FTP variables in the same terminal session that runs Studio:

```powershell
$env:FTP_HOST = "your-ftp-host"
$env:FTP_USER = "your-ftp-user"
$env:FTP_PASS = "your-password"
$env:FTP_DIR = "/public_html"
npm run studio
```

FTP upload uses the machine's `curl` command and creates remote directories as needed. Never commit real credentials.

For manual deployment, upload the complete **contents** of `dist/` to the corresponding web root, preserving subfolders. Deploy the full output together, not just changed files.
