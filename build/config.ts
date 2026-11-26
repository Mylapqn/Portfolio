/** Public site configuration shared by the build modules. */
export const SITE_URL = (process.env.SITE_URL || 'https://mylapqn.github.io/Portfolio').replace(/\/+$/, '');
export const SITE_ORIGIN = new URL(SITE_URL).origin;
export const SITE_BASE_PATH = normalizeBasePath(process.env.SITE_BASE_PATH || '');
export const SITE_NAME = 'Matouš Marek | Portfolio';

/**
 * Validates and normalizes a deployment path prefix.
 *
 * @throws If a path segment contains unsupported characters or traversal segments.
 */
export function normalizeBasePath(value: string): string {
  const segments = value.split('/').filter(Boolean);
  if (segments.some((segment) => !/^[A-Za-z0-9._~-]+$/.test(segment) || segment === '.' || segment === '..')) {
    throw new Error(`Invalid SITE_BASE_PATH: ${value}`);
  }
  return segments.length ? `/${segments.join('/')}` : '';
}

/** Adds the deployment prefix to a root-relative asset path. */
export function prefixSitePath(value: string): string {
  return SITE_BASE_PATH && value.startsWith('/') && !value.startsWith('//')
    ? `${SITE_BASE_PATH}${value}`
    : value;
}

/** Adds the deployment prefix to root-relative URLs in rendered Markdown. */
export function prefixRootRelativeUrls(html: string): string {
  if (!SITE_BASE_PATH) return html;
  return html.replace(
    /\b(src|href)=(["'])\/(?!\/)/gi,
    (_match, attribute: string, quote: string) => `${attribute}=${quote}${SITE_BASE_PATH}/`
  );
}
