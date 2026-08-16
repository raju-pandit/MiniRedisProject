
'use strict';

const net = require('node:net');
const { commandRequest } = require('../src/resp');

const argumentsList = process.argv.slice(2);
const host = optionValue('--host', '127.0.0.1');
const port = Number(optionValue('--port', '8000'));
const command = commandParts();

if (!command.length || !Number.isInteger(port)) {
  console.error('Usage: miniredis-cli [--host HOST] [--port PORT] COMMAND [ARG ...]');
  process.exit(1);
}

const client = net.createConnection({ host, port }, () => {
  client.write(commandRequest(command));
});

let responseBuffer = Buffer.alloc(0);

client.on('data', (chunk) => {
  responseBuffer = Buffer.concat([responseBuffer, chunk]);
  const response = parseReply(responseBuffer);

  if (!response || response.offset !== responseBuffer.length) {
    return;
  }

  process.stdout.write(`${formatReply(response.value)}\n`);
  client.end();
});

client.on('error', (err) => {
  console.error(`Connection error: ${err.message}`);
  process.exitCode = 1;
});

function optionValue(name, fallback) {
  const index = argumentsList.indexOf(name);
  return index === -1 ? fallback : argumentsList[index + 1];
}

function commandParts() {
  const parts = [];

  for (let index = 0; index < argumentsList.length; index += 1) {
    const value = argumentsList[index];

    if (value === '--host' || value === '--port') {
      index += 1;
      continue;
    }

    parts.push(value);
  }

  return parts;
}

function parseReply(buffer, start = 0) {
  if (start >= buffer.length) {
    return null;
  }

  const type = String.fromCharCode(buffer[start]);
  const lineEnd = buffer.indexOf('\r\n', start);

  if (lineEnd === -1) {
    return null;
  }

  const header = buffer.toString('utf8', start + 1, lineEnd);
  const bodyStart = lineEnd + 2;

  if (type === '+' || type === '-') {
    return { value: { type: type === '+' ? 'simple' : 'error', data: header }, offset: bodyStart };
  }

  if (type === ':') {
    return { value: { type: 'integer', data: Number(header) }, offset: bodyStart };
  }

  if (type === '$') {
    const length = Number(header);

    if (length === -1) {
      return { value: { type: 'null', data: null }, offset: bodyStart };
    }

    const bodyEnd = bodyStart + length;

    if (bodyEnd + 2 > buffer.length) {
      return null;
    }

    return {
      value: { type: 'bulk', data: buffer.toString('utf8', bodyStart, bodyEnd) },
      offset: bodyEnd + 2,
    };
  }

  if (type === '*') {
    const length = Number(header);

    if (length === -1) {
      return { value: { type: 'null', data: null }, offset: bodyStart };
    }

    const values = [];
    let offset = bodyStart;

    for (let index = 0; index < length; index += 1) {
      const item = parseReply(buffer, offset);

      if (!item) {
        return null;
      }

      values.push(item.value);
      offset = item.offset;
    }

    return { value: { type: 'array', data: values }, offset };
  }

  return null;
}

function formatReply(reply, depth = 0) {
  if (reply.type === 'error') {
    return `(error) ${reply.data}`;
  }

  if (reply.type === 'null') {
    return '(nil)';
  }

  if (reply.type !== 'array') {
    return String(reply.data);
  }

  if (reply.data.length === 0) {
    return '(empty array)';
  }

  return reply.data
    .map((item, index) => `${'  '.repeat(depth)}${index + 1}) ${formatReply(item, depth + 1)}`)
    .join('\n');
}
