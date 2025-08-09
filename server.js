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
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.json': 'application/json'
    };
    
    // If no extension and file doesn't exist, try adding .html
    if (!fs.existsSync(filePath) && ext === '') {
        filePath += '.html';
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - File Not Found</h1>');
        } else {
            res.writeHead(200, { 
                'Content-Type': mimeTypes[ext] || 'text/plain',
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        }
    });
});

server.listen(8000, () => {
    console.log('Server running at http://localhost:8000');
});
