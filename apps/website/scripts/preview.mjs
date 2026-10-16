import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../design/', import.meta.url));
const port = Number(process.env.NMA_PREVIEW_PORT || 4322);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const routes = { '/': 'index.html', '/about': 'about.html', '/about/': 'about.html', '/robots.txt': 'robots.txt' };
    const name = routes[url.pathname] || decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const target = path.resolve(root, name);
    if (!target.startsWith(root) || !mime[path.extname(target)]) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const data = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime[path.extname(target)], 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Page not found. Return to the preview at /.');
  }
}).listen(port, '127.0.0.1', () => console.log(`NMA Ogun design preview: http://localhost:${port}`));
