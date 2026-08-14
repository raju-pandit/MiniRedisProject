#!/usr/bin/env node
const path = require('node:path');
const { createServer } = require('./src/server');

const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || '127.0.0.1';
const snapshotPath = process.env.SNAPSHOT_PATH || path.join(process.cwd(), 'data', 'snapshot.json');
const app = createServer({ snapshotPath });

app.listen(port, host, () => console.log(`MiniRedis listening on ${host}:${port}`));
function shutdown() { app.close(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
