# Authoring content

Each entry is a Markdown file in `content/`. Its filename is the stable ID used in the page URL: `content/orbit-puzzle.md` becomes `/p/orbit-puzzle/`. Prefer a short lowercase, hyphen-separated filename and keep it unchanged after publishing.

## File format

Each file can start with a simple frontmatter block followed by a Markdown body:

```markdown
---
title: Orbit Puzzle
type: work
date: 2026-04-15
tags: games, interaction, engineering
thumb: /assets/orbit-puzzle-cover.webp
summary: A short description shown on the home-page card.
size: 2
color: "#58a6ff"
url: https://example.com/orbit-puzzle
embed: https://example.com/orbit-puzzle/embed
---

Write the full project description here.

![A caption for the image](/assets/orbit-puzzle-process.webp)
```

Frontmatter is intentionally not full YAML: use one `key: value` per line, with the opening and closing `---` on their own lines. Tags are comma-separated. Use `YYYY-MM-DD` dates; entries sort newest first by date.

## Fields

| Field | Meaning |
| --- | --- |
| `title` | Display title; defaults to the filename ID. |
| `type` | `work` or `article`. Only `work` is treated as Work; other values become articles. |
| `date` | Entry date; defaults to `1970-01-01` if omitted. |
| `tags` | Optional comma-separated tags used by feed filters. |
| `thumb` | Optional card/preview image URL, usually `/assets/<filename>`. |
| `summary` | Optional card description and social description. |
| `size` | Work-card size `1`, `2`, or `3`; defaults to `1` and is ignored for articles. |
| `color` | Optional six-digit hex work color, e.g. `#58a6ff`; used on the work card and detail-page background. |
| `url` | Optional external project link. |
| `embed` | Optional URL embedded on the detail page. |

## Use Studio

1. Run `npm run studio` from the project root and open <http://localhost:4173/>.
2. Select an entry to edit or choose **New project**. A new entry's slug is generated from its title; an existing entry's slug cannot be changed in Studio.
3. Edit its metadata and body. Tag suggestions come from existing entries.
4. Choose **Save** to write Markdown and uploaded images, or **Save & Build** to also rebuild the site.

Drop an image onto the thumbnail area to set the cover. Drop images into the Markdown editor to upload them and insert Markdown image links. Studio sanitizes uploaded filenames and prefixes them with the current slug; set the title/slug before adding images. Unsaved changes must be saved or discarded before switching entries.

The dashboard's **Build Content** rebuilds from saved files. **Build & Push to FTP** also uploads the generated site; neither dashboard action saves unsaved editor changes. For FTP setup, see [Build and publish](./build-and-publish.md).

## Edit by hand

1. Create or edit `content/<id>.md` using the format above.
2. Store images in `assets/` and reference their public paths, for example `/assets/orbit-puzzle-cover.webp`. Do not use Windows disk paths.
3. Run `npm run build`.

The build copies all of `assets/` to `dist/assets/` and prefixes root-relative Markdown image/link paths when `SITE_BASE_PATH` is set. Use a new filename when replacing a published image so browser caches do not keep showing the old file; see [Build versions and browser caching](./versioning.md).
