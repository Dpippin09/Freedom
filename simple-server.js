const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Specific routes for your pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/camera-wardrobe.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'camera-wardrobe.html'));
});

app.get('/test-search.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-search.html'));
});

app.get('/best-deals.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'best-deals.html'));
});

app.get('/trending-now.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'trending-now.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.listen(port, () => {
    console.log(`🚀 Fashion site running at http://localhost:${port}`);
    console.log(`📷 Camera Wardrobe available at http://localhost:${port}/camera-wardrobe.html`);
    console.log(`🔍 Test Search available at http://localhost:${port}/test-search.html`);
    console.log(`✨ All features working without database dependency`);
});
