const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
        '.ico': 'image/x-icon'
    };
    
    // Special handling for service worker
    if (req.url === '/sw.js') {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-cache');
    }
    
    // Special handling for manifest
    if (req.url === '/manifest.json') {
        res.setHeader('Content-Type', 'application/manifest+json');
    }
    
    // If no extension and file doesn't exist, try adding .html
    if (!fs.existsSync(filePath) && ext === '') {
        filePath += '.html';
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
        } else {
            const contentType = mimeTypes[ext] || 'text/plain';
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': req.url === '/sw.js' ? 'no-cache' : 'public, max-age=3600'
            });
            res.end(data);
        }
    });
});

server.listen(8000, () => {
    console.log('🚀 Aced Fashion PWA Server running at http://localhost:8000');
    console.log('📱 Your app can now be installed as a PWA!');
});
