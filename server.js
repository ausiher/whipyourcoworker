const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const selfsigned = require('selfsigned');
const qrcode = require('qrcode-terminal');

const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const WEB_DIR = path.join(__dirname, 'web');

// ── MIME Types ──────────────────────────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

// ── Static File Handler ─────────────────────────────────────────────────────
function handleRequest(req, res) {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(WEB_DIR, reqPath);

  // Security: prevent path traversal outside WEB_DIR
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support Audio Range Requests (for smooth audio seek/play on iOS/Safari)
    const range = req.headers.range;
    if (range && ext === '.mp3') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });

    fs.createReadStream(filePath).pipe(res);
  });
}

// ── Find Local LAN IP ───────────────────────────────────────────────────────
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ── Start Server ────────────────────────────────────────────────────────────
async function start() {
  const localIp = getLocalIp();

  // Generate self-signed TLS cert for HTTPS (required for phone camera access)
  console.log('⚡ Generating local SSL certificate for mobile camera support...');
  const attrs = [{ name: 'commonName', value: localIp }];
  const pems = await selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
  });

  const httpsOptions = {
    key: pems.private,
    cert: pems.cert,
  };

  // 1. Start HTTPS server (Primary for phones)
  const httpsServer = https.createServer(httpsOptions, handleRequest);
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    // 2. Start HTTP server (Secondary for desktop/localhost)
    const httpServer = http.createServer(handleRequest);
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
      const phoneUrl = `https://${localIp}:${HTTPS_PORT}`;
      const localUrl = `https://localhost:${HTTPS_PORT}`;
      const httpUrl = `http://localhost:${HTTP_PORT}`;

      console.log('\n========================================================');
      console.log('       🔥 OpenWhip AR Camera Server is Running! 🔥');
      console.log('========================================================\n');
      console.log(`📱 Scan this QR code on your phone to open the filter:\n`);

      qrcode.generate(phoneUrl, { small: true });

      console.log(`\n🔗 Access URLs:`);
      console.log(`   • Phone (Wi-Fi HTTPS): ${phoneUrl}`);
      console.log(`   • Desktop Local:      ${localUrl}  (or ${httpUrl})`);
      console.log('\n💡 Tip for Phone connection:');
      console.log('   When your phone browser shows a self-signed warning, tap:');
      console.log('   "Advanced" -> "Proceed to site (unsafe)" to allow camera access.\n');
      console.log('⚡ Tap anywhere on your screen to whip targets!\n');
    });
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});
