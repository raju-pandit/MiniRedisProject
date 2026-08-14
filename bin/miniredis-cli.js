#!/usr/bin/env node
'use strict';
const net = require('node:net');
const { commandRequest } = require('../src/resp');

const raw = process.argv.slice(2);
const option = (name, fallback) => { const index = raw.indexOf(name); return index >= 0 ? raw[index + 1] : fallback; };
const host = option('--host', '127.0.0.1'); const port = Number(option('--port', 8000));
const command = raw.filter((_, index) => !['--host', '--port'].includes(raw[index]) && !['--host', '--port'].includes(raw[index - 1]));
if (!command.length || !Number.isInteger(port)) { console.error('Usage: miniredis-cli [--host HOST] [--port PORT] COMMAND [ARG ...]'); process.exit(1); }
const client = net.createConnection({ host, port }, () => client.write(commandRequest(command)));
let reply = '';
client.on('data', (chunk) => { reply += chunk; if (isComplete(reply)) client.end(); });
client.on('end', () => process.stdout.write(formatReply(reply)));
client.on('error', (err) => { console.error(`Connection error: ${err.message}`); process.exitCode = 1; });
function isComplete(value) { if (/^[+\-:]([^\r]*)\r\n$/.test(value) || value === '$-1\r\n') return true; if (!value.startsWith('$')) return false; const end = value.indexOf('\r\n'); const length = Number(value.slice(1, end)); return end >= 0 && value.length >= end + 2 + length + 2; }
function formatReply(value) { if (value.startsWith('+')) return `${value.slice(1, -2)}\n`; if (value.startsWith('-')) return `(error) ${value.slice(1, -2)}\n`; if (value.startsWith(':')) return `${value.slice(1, -2)}\n`; if (value === '$-1\r\n') return '(nil)\n'; if (value.startsWith('$')) return `${value.split('\r\n')[1]}\n`; return value; }
