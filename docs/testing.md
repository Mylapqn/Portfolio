# Tests and checks

Automated tests run small, repeatable checks against the code. Each test gives the program known input, then checks whether the result matches the expected behavior. They are useful for catching regressions: a change that accidentally breaks something that used to work.

Tests are a safety net, not proof that every part of the site works. They do not replace checking the site in a browser.

## What this project checks

Run `npm test` from the project folder. It uses Node's built-in test runner through `tsx` and finds the test files in `tests/`.

The current tests check:

- Frontmatter parsing, including Windows-style line endings.
- Template replacement and deployment path validation.
- Browser manifest validation, including useful errors for invalid data.
- Versioned URLs for static and dynamic browser-module imports.
- A complete build at `/Portfolio`, including generated pages, assets, and module URLs.

The build-output test rebuilds the generated `dist/` folder using `/Portfolio` as its path prefix. It does not edit source content. To regenerate `dist/` for the default site root afterward, run `npm run build` with `SITE_BASE_PATH` unset.

## Tests, typechecking, and building

These commands check different things:

| Command | What it checks |
| --- | --- |
| `npm test` | Runs the automated behavior and build-output tests. |
| `npm run typecheck` | Checks TypeScript and the checked Studio browser JavaScript for type errors. It does not generate the site. |
| `npm run build` | Generates the site in `dist/`. A successful build does not by itself prove every behavior is correct. |

After changing code, run `npm test` and `npm run typecheck`; run `npm run build` when you want to generate or preview the site. If you are unsure which checks apply, run all three. GitHub Actions runs the tests, typecheck, and deployment build for changes pushed to or proposed for `main`.

For a fresh checkout, install dependencies once with `npm ci` before running these commands. See [Build and publish](./build-and-publish.md) for the full local workflow.

## Reading the result

Each passing test is printed with a check mark. If a test fails, the output names the test and shows the failed expectation, often with the expected and actual values. Start with that test and the referenced source code; the failure may reveal a bug, or it may mean the intended behavior has changed and the test needs an intentional update.

The tests are in `tests/`. When fixing a bug or adding behavior, add or adjust a focused test so the same issue is checked automatically in future runs.

The current suite does not check visual styling, every Studio interaction, or publishing to a live FTP server. Those still need manual verification when relevant. For generated output details, see [Build and publish](./build-and-publish.md).
