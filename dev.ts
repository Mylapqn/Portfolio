/// <reference types="node" />

import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const WATCHED_EXTENSIONS = new Set(['.css', '.html', '.ts']);
const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};
const PORT = Number(process.env.PORT || 4174);
const liveClients = new Set<http.ServerResponse>();

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

/** Rebuilds the site and notifies connected browsers to reload. */
function rebuildSite(): void {
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
    for (const client of liveClients) {
      client.write('event: reload\ndata: built\n\n');
    }
  } catch (error: unknown) {
    console.error('Live rebuild failed; the preview was not refreshed.', error);
  }
}

/** Injects a small browser-side listener for successful live rebuilds. */
function addLiveReload(html: string): string {
  const script = '<script>new EventSource("/__live").addEventListener("reload", () => location.reload());</script>';
  return html.replace(/<\/body>/i, `${script}</body>`);
}

/** Serves files from dist while keeping requests inside the generated site. */
function serveFile(request: http.IncomingMessage, response: http.ServerResponse): void {
  let requestPath: string;
  try {
    requestPath = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    response.end('Invalid URL');
    return;
  }

  const filePath = path.resolve(DIST_DIR, `.${requestPath}`);
  const relativePath = path.relative(DIST_DIR, filePath);
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  const resolvedPath = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
    ? path.join(filePath, 'index.html')
    : filePath;
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const contentType = MIME_TYPES[path.extname(resolvedPath).toLowerCase()] || 'application/octet-stream';
  let content = fs.readFileSync(resolvedPath);
  if (contentType.startsWith('text/html')) {
    content = Buffer.from(addLiveReload(content.toString('utf8')));
  }
  response.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Content-Length': content.length,
    'Content-Type': contentType
  });
  response.end(request.method === 'HEAD' ? undefined : content);
}

/** Starts the static server and watches source files for changes. */
function startDevServer(): void {
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

  let rebuildTimer: NodeJS.Timeout | undefined;
  const scheduleRebuild = (fileName: string | Buffer | null): void => {
    const changedFile = fileName === null ? '' : fileName.toString();
    if (changedFile && !WATCHED_EXTENSIONS.has(path.extname(changedFile).toLowerCase())) return;

    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuildSite, 150);
  };

  for (const directory of ['src', 'build']) {
    fs.watch(path.join(ROOT, directory), { recursive: true }, (_eventType, fileName) => {
      scheduleRebuild(fileName);
    });
  }
  fs.watch(ROOT, (_eventType, fileName) => {
    if (fileName?.toString() === 'build.ts') scheduleRebuild(fileName);
  });

  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    if (request.method === 'GET' && requestUrl.pathname === '/__live') {
      response.writeHead(200, {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream'
      });
      response.write(': connected\n\n');
      liveClients.add(response);
      response.on('close', () => liveClients.delete(response));
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }
    serveFile(request, response);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Live portfolio preview at http://localhost:${PORT}/`);
  });
}

startDevServer();
