export interface ParsedFrontmatter {
  metadata: Record<string, string>;
  body: string;
}

/** Parses the project's intentionally simple key/value Markdown header. */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const normalizedMarkdown = markdown.replace(/\r\n/g, '\n');
  if (!normalizedMarkdown.startsWith('---\n')) {
    return { metadata: {}, body: normalizedMarkdown };
  }

  const headerEnd = normalizedMarkdown.indexOf('\n---\n', 4);
  if (headerEnd === -1) return { metadata: {}, body: normalizedMarkdown };

  const metadata: Record<string, string> = {};
  const frontmatter = normalizedMarkdown.slice(4, headerEnd);
  const body = normalizedMarkdown.slice(headerEnd + 5).replace(/^\n/, '');

  for (const line of frontmatter.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key) metadata[key] = value;
  }

  return { metadata, body };
}
