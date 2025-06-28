// Docker Health Check Script
const http = require('http');
const config = require('./server/config');

const options = {
    hostname: 'localhost',
    port: config.get('server.port') || 3000,
    path: '/health/quick',
    method: 'GET',
    timeout: 2000
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        console.log('Health check passed');
        process.exit(0);
    } else {
        console.log(`Health check failed with status: ${res.statusCode}`);
        process.exit(1);
    }
});

req.on('error', (err) => {
    console.log(`Health check failed: ${err.message}`);
    process.exit(1);
});

req.on('timeout', () => {
    console.log('Health check timeout');
    req.destroy();
    process.exit(1);
});

req.setTimeout(2000);
req.end();
