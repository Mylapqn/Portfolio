/** Replaces named template placeholders once, without reprocessing inserted values. */
export function injectTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (placeholder, key: string) =>
    Object.hasOwn(tokens, key) ? tokens[key] : placeholder
  );
}

/** Escapes text before inserting it into HTML content. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escapes text for use inside a quoted HTML attribute. */
export function escapeAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

/** Formats an entry date as a month and year, preserving unparseable input. */
export function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

/** Darkens a validated hexadecimal color for the project page background. */
export function darkenColor(color: string, darkenFactor: number = 0.4): string {
  const channels = color.slice(1).match(/.{2}/g);
  if (!channels) return '#0d0f12';
  return `#${channels.map((channel) =>
    Math.round(parseInt(channel, 16) * darkenFactor).toString(16).padStart(2, '0')
  ).join('')}`;
}

/** Wraps standalone Markdown image paragraphs in figures with optional captions. */
export function addImageCaptions(html: string): string {
  return html.replace(/<p>(<img\b[^>]*>)<\/p>/g, (_match, imageTag: string) => {
    const alt = imageTag.match(/\balt="([^"]*)"/)?.[1];
    return `<figure>${imageTag}${alt ? `<figcaption>${alt}</figcaption>` : ''}</figure>`;
  });
}
