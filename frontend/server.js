const http = require('http');
const fs = require('fs');
const path = require('path');
const base = __dirname;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

http.createServer((req, res) => {
  let fp = decodeURIComponent(req.url.split('?')[0]);
  if (fp === '/' || fp === '/index.html') fp = '/ocean-guardian.html';
  try {
    const content = fs.readFileSync(path.join(base, fp));
    const ext = path.extname(fp);
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(3000, () => console.log('Frontend: http://localhost:3000'));
