/** Prefixes a site-root path with the deployment path, such as /portfolio. */
export function sitePath(path: string): string {
    const basePath = document.querySelector<HTMLMetaElement>('meta[name="site-base-path"]')?.content || '';
    return `${basePath}${path}`;
}
