# Codebase improvement plan

This plan records code and tooling improvements from the repository review. The duplicate Markdown entries in `content/` are intentional test data and are explicitly out of scope. Do not remove, rename, or consolidate them as part of this work.

## Guiding approach

- Preserve the static-site architecture and the existing public behavior.
- Prefer the existing TypeScript and `tsx` toolchain; do not add a framework.
- Add focused checks before changing parsing, output, or cache behavior.
- Keep generated files in `dist/`; change their source and rebuild.

## Implementation steps

### 1. Add focused regression tests

There is currently no test command. Add a small test suite using Node's built-in test runner through the existing `tsx` dependency. Cover the frontmatter format, template replacement, site-path prefixing, and generated manifest/page output. Include edge cases before refactoring those behaviors. Avoid bringing in a browser test framework unless DOM-level tests prove necessary.

### 2. Share frontmatter parsing between the build and Studio

The build and Studio each parse the same simple key/value frontmatter, but currently differ in how they handle leading body newlines. Move the parsing logic into one small shared module used by `build/content.ts` and `studio/studio.ts`. Normalize CRLF consistently and explicitly define how the separator newline is handled; verify rendered output and Studio round-tripping remain unchanged. Keep this format intentionally simpler than full YAML and document its limits.

### 3. Make template token replacement single-pass

Change `injectTokens` in `build/template.ts` so it scans the original template once and inserts token values literally. This prevents placeholder-like text inside titles or summaries from being interpreted by later replacement passes. Add tests for nested-looking placeholders and replacement-string characters such as `$&`.

### 4. Validate the browser manifest and report load failures

Treat fetched JSON as untrusted input rather than asserting it is already a `PortfolioItem[]`. Add a small runtime guard for the required item fields and supported types. Ensure fetch, JSON parsing, and validation errors all reach the visible feed status; use a rejection path that also catches errors thrown while processing a successful response.

### 5. Make Studio date and save state reliable

- Set the date input using the local calendar date rather than assigning `new Date()` to `valueAsDate`, which represents a UTC date.
- Track uploaded-file changes by more than filename so replacing a thumbnail with a same-named file marks the form dirty.
- Do not allow Save to race with pending `FileReader` work. Await pending reads or disable saving until they complete.
- Prevent edits made during an in-flight save from being silently overwritten when the saved project is reloaded. Either disable editor controls during the save or detect and preserve post-submit edits.

Manually verify new and existing entries, same-name file replacement, slow file reads, and edits made while saving.

### 6. Replace post-compile import rewriting with explicit bundling

The build currently edits emitted JavaScript with a regular expression to append cache-version queries to module imports. Replace this brittle rewrite with an explicit browser bundle, using a declared build dependency such as esbuild. Keep TypeScript typechecking separate, preserve the versioned entry-script URL and manifest request, and keep the existing immutable caching behavior. Confirm both the root deployment and `/Portfolio` deployment still load correctly, then update the versioning and troubleshooting docs.

Also document the supported browser baseline and align the TypeScript `target` with that baseline. Align `@types/node` with the Node version used by CI (currently Node 24), or explicitly document why a different type version is required.

### 7. Make Studio FTP command execution clearer

Replace the interpolated shell command in `uploadDistViaFtp` with an argument-based child-process call. Keep errors visible instead of suppressing curl diagnostics. Verify paths containing spaces, configured remote directories, and a failed upload produce useful Studio errors.

### 8. Apply small accessibility and readability fixes

- Add a descriptive `title` to generated embed iframes.
- Add a reduced-motion rule to the public site styles, matching Studio's support.
- Remove the repeated Blog hero setup in `feed.ts`; keep the view-specific configuration in one place.
- Add `// @ts-check` and JSDoc types to Studio's browser client in manageable steps, then include it in typechecking. Avoid a full conversion to TypeScript unless gradual checking shows a clear benefit.
- Review the byte-identical image assets separately from the Markdown fixtures. Confirm references and intent before consolidating or removing any asset.

Do not introduce shared HTML partial machinery or split the existing CSS further just to eliminate small, stable repetitions.

## Completion checks

- `npm run typecheck` passes, including the Studio browser client.
- The new test command passes.
- `npm run build` produces the expected manifest, standalone pages, and versioned assets.
- Build and browser behavior work with both an empty base path and `SITE_BASE_PATH=/Portfolio`.
- Studio save, rebuild, and FTP failure states remain understandable and do not discard edits.
- The intentional Markdown test entries remain unchanged.
