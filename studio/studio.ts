/// <reference types="node" />

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const PORT = Number(process.env.STUDIO_PORT) || 4173;
const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');
const STUDIO_DIR = path.join(ROOT, 'studio');
const STUDIO_STYLES = new Set([
    'studio-base.css',
    'studio-editor.css',
    'studio-components.css',
    'studio-responsive.css'
]);

const ftpConfig = {
    host: process.env.FTP_HOST || '',
    user: process.env.FTP_USER || '',
    pass: process.env.FTP_PASS || '',
    remoteDir: process.env.FTP_DIR || '/public_html'
};

interface UploadedFile {
    name: string;
    dataUrl: string;
}

interface SavePayload {
    id: string;
    existingId?: string;
    type: 'work' | 'article';
    title: string;
    date: string;
    tags: string[];
    summary: string;
    thumb: string;
    url: string;
    embed: string;
    size: number;
    color: string;
    body: string;
    thumbFile?: UploadedFile | null;
    inlineFiles: UploadedFile[];
}

interface BuildPayload {
    pushFtp?: boolean;
}

interface Project {
    id: string;
    type: 'work' | 'article';
    title: string;
    date: string;
    tags: string[];
    summary: string;
    thumb: string;
    url: string;
    embed: string;
    size: number;
    color: string;
}

interface ParsedContent {
    project: Project;
    body: string;
}

function parseContent(id: string, markdown: string): ParsedContent {
    const metadata: Record<string, string> = {};
    const normalizedMarkdown = markdown.replace(/\r\n/g, '\n');
    let body = normalizedMarkdown;

    if (normalizedMarkdown.startsWith('---\n')) {
        const headerEnd = normalizedMarkdown.indexOf('\n---\n', 4);
        if (headerEnd !== -1) {
            for (const line of normalizedMarkdown.slice(4, headerEnd).split('\n')) {
                const separatorIndex = line.indexOf(':');
                if (separatorIndex === -1) continue;
                const key = line.slice(0, separatorIndex).trim();
                const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
                metadata[key] = value;
            }
            body = normalizedMarkdown.slice(headerEnd + 5).replace(/^\n+/, '');
        }
    }

    return {
        project: {
            id,
            type: metadata.type === 'work' ? 'work' : 'article',
            title: metadata.title || id,
            date: metadata.date || '',
            tags: (metadata.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
            summary: metadata.summary || '',
            thumb: metadata.thumb || '',
            url: metadata.url || '',
            embed: metadata.embed || '',
            size: metadata.size === '2' || metadata.size === '3' ? Number(metadata.size) : 1,
            color: /^#[0-9a-f]{6}$/i.test(metadata.color || '') ? metadata.color : ''
        },
        body
    };
}

/** Provides metadata for the project browser and editor. */
function getProjects(): ParsedContent[] {
    if (!fs.existsSync(CONTENT_DIR)) return [];
    return fs.readdirSync(CONTENT_DIR)
        .filter((fileName) => fileName.endsWith('.md'))
        .map((fileName) => {
            const id = path.basename(fileName, '.md');
            return parseContent(id, fs.readFileSync(path.join(CONTENT_DIR, fileName), 'utf8'));
        })
        .sort((first, second) =>
            first.project.title.localeCompare(second.project.title, undefined, { sensitivity: 'base' })
        );
}

/** Supplies tag suggestions from all existing entries. */
function getExistingTags(): string[] {
    const tags = new Set<string>();
    for (const { project } of getProjects()) {
        project.tags.forEach((tag) => tags.add(tag));
    }
    return Array.from(tags).sort((first, second) =>
        first.localeCompare(second, undefined, { sensitivity: 'base' })
    );
}

/** Resolves a content filename only when the ID is a single safe path segment. */
function contentPath(id: string): string {
    if (!id || id === '.' || id === '..' || id.includes('/') || id.includes('\\')) {
        throw new Error('Invalid project ID.');
    }
    const filePath = path.resolve(CONTENT_DIR, `${id}.md`);
    if (!filePath.startsWith(`${CONTENT_DIR}${path.sep}`)) {
        throw new Error('Invalid project ID.');
    }
    return filePath;
}

/** Persists an uploaded data URL and returns the public path used by content. */
function saveDataUrl(file: UploadedFile, filenamePrefix: string): string {
    fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const savedFilename = `${filenamePrefix}-${safeFilename}`;
    const encodedFileData = file.dataUrl.split(',')[1];
    if (!encodedFileData) throw new Error(`Invalid image upload: ${file.name}`);
    fs.writeFileSync(
        path.join(ROOT, 'assets', savedFilename),
        Buffer.from(encodedFileData, 'base64')
    );
    return `/assets/${savedFilename}`;
}

/** Publishes every generated file to the configured FTP destination. */
function uploadDistViaFtp(): void {
    if (!ftpConfig.host || !ftpConfig.user || !ftpConfig.pass) {
        throw new Error('Set FTP_HOST, FTP_USER, and FTP_PASS environment variables to enable auto-FTP.');
    }

    const listFiles = (directory: string): string[] =>
        fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
            const filePath = path.join(directory, entry.name);
            return entry.isDirectory() ? listFiles(filePath) : [filePath];
        });

    for (const filePath of listFiles(path.join(ROOT, 'dist'))) {
        const remotePath = path.relative(path.join(ROOT, 'dist'), filePath).replace(/\\/g, '/');
        const remoteUrl = `ftp://${ftpConfig.host}${ftpConfig.remoteDir}/${remotePath}`;
        execSync(
            `curl -s --ftp-create-dirs -T "${filePath}" -u "${ftpConfig.user}:${ftpConfig.pass}" "${remoteUrl}"`,
            { cwd: ROOT }
        );
    }
}

function readRequestBody(request: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        request.on('error', reject);
    });
}

function sendJson(response: http.ServerResponse, statusCode: number, body: unknown): void {
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
}

/** Saves Markdown and any newly uploaded assets without rebuilding the site. */
async function handleSaveRequest(
    request: http.IncomingMessage,
    response: http.ServerResponse
): Promise<void> {
    try {
        const payload = JSON.parse(await readRequestBody(request)) as SavePayload;
        if (!payload.id || !payload.title) throw new Error('Title and slug are required.');
        if (
            payload.type === 'work' &&
            payload.size !== 1 &&
            payload.size !== 2 &&
            payload.size !== 3
        ) {
            throw new Error('Work card size must be 1, 2, or 3.');
        }
        if (payload.type === 'work' && payload.color && !/^#[0-9a-f]{6}$/i.test(payload.color)) {
            throw new Error('Work color must be a 6-digit hex value.');
        }

        const destination = contentPath(payload.id);
        if (payload.existingId) {
            const existingPath = contentPath(payload.existingId);
            if (!fs.existsSync(existingPath)) throw new Error('The project being edited no longer exists.');
            if (payload.id !== payload.existingId) {
                throw new Error('A project slug cannot be changed while editing.');
            }
        } else if (fs.existsSync(destination)) {
            throw new Error(`A project with the slug "${payload.id}" already exists.`);
        }

        const thumbnailPath = payload.thumbFile
            ? saveDataUrl(payload.thumbFile, payload.id)
            : payload.thumb.trim();
        for (const image of payload.inlineFiles || []) {
            saveDataUrl(image, payload.id);
        }

        const frontmatterLines = [
            '---',
            `title: ${payload.title.replace(/[\r\n]/g, ' ')}`,
            `type: ${payload.type}`,
            `date: ${payload.date}`,
            `tags: ${payload.tags.join(', ')}`,
            thumbnailPath ? `thumb: ${thumbnailPath}` : '',
            `summary: ${payload.summary.replace(/[\r\n]/g, ' ')}`,
            payload.url ? `url: ${payload.url.replace(/[\r\n]/g, ' ')}` : '',
            payload.embed ? `embed: ${payload.embed.replace(/[\r\n]/g, ' ')}` : '',
            payload.type === 'work' ? `size: ${payload.size}` : '',
            payload.type === 'work' && /^#[0-9a-f]{6}$/i.test(payload.color)
                ? `color: ${payload.color}`
                : '',
            '---',
            '',
            payload.body
        ];
        const markdown = frontmatterLines
            .filter((line, index, lines) => line !== '' || lines[index - 1] === '---')
            .join('\n');

        fs.mkdirSync(CONTENT_DIR, { recursive: true });
        fs.writeFileSync(destination, markdown, 'utf8');

        sendJson(response, 200, {
            ok: true,
            message: `Saved content/${payload.id}.md.`
        });
    } catch (error: unknown) {
        sendJson(response, 500, {
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/** Builds saved content and optionally uploads the generated site. */
async function handleBuildRequest(
    request: http.IncomingMessage,
    response: http.ServerResponse
): Promise<void> {
    try {
        const payload = JSON.parse(await readRequestBody(request)) as BuildPayload;
        execSync('npm run build', { stdio: 'inherit', cwd: ROOT });
        if (payload.pushFtp) uploadDistViaFtp();

        sendJson(response, 200, {
            ok: true,
            message: payload.pushFtp
                ? 'Built /dist and uploaded it to FTP.'
                : 'Built /dist.'
        });
    } catch (error: unknown) {
        sendJson(response, 500, {
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

function serveStudioAsset(response: http.ServerResponse, fileName: string, contentType: string): void {
    const filePath = path.join(STUDIO_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        response.writeHead(500);
        response.end(`Missing Studio asset: ${fileName}`);
        return;
    }
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(fs.readFileSync(filePath));
}

const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://localhost');

    if (request.method === 'GET' && requestUrl.pathname === '/') {
        serveStudioAsset(response, 'index.html', 'text/html; charset=utf-8');
        return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/studio.css') {
        serveStudioAsset(response, 'studio.css', 'text/css; charset=utf-8');
        return;
    }
    if (request.method === 'GET' && STUDIO_STYLES.has(requestUrl.pathname.slice(1))) {
        serveStudioAsset(response, requestUrl.pathname.slice(1), 'text/css; charset=utf-8');
        return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/client.js') {
        serveStudioAsset(response, 'client.js', 'text/javascript; charset=utf-8');
        return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/projects') {
        sendJson(response, 200, getProjects().map(({ project }) => project));
        return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/tags') {
        sendJson(response, 200, getExistingTags());
        return;
    }
    if (request.method === 'GET' && requestUrl.pathname.startsWith('/api/projects/')) {
        try {
            const id = decodeURIComponent(requestUrl.pathname.slice('/api/projects/'.length));
            const filePath = contentPath(id);
            if (!fs.existsSync(filePath)) {
                sendJson(response, 404, { error: 'Project not found.' });
                return;
            }
            sendJson(response, 200, parseContent(id, fs.readFileSync(filePath, 'utf8')));
        } catch (error: unknown) {
            sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
        }
        return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/save') {
        await handleSaveRequest(request, response);
        return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/build') {
        await handleBuildRequest(request, response);
        return;
    }

    response.writeHead(404);
    response.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Portfolio Studio running at http://localhost:${PORT}`);
});
