
'use strict';

const path = require('node:path');
const { createServer } = require('./src/server');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8000);
const snapshotPath = process.env.SNAPSHOT_PATH || path.join(process.cwd(), 'data', 'snapshot.json');
const server = createServer({ snapshotPath });

server.listen(port, host, () => {
  console.log(`MiniRedis listening on ${host}:${port}`);
});

function stopServer() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', stopServer);
process.on('SIGTERM', stopServer);
