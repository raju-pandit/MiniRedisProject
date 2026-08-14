'use strict';

function encode(value) {
  if (value && value.kind === 'error') {
    return `-ERR ${value.message}\r\n`;
  }

  if (value && value.kind === 'simple') {
    return `+${value.message}\r\n`;
  }

  if (value === null || value === undefined) {
    return '$-1\r\n';
  }

  if (Number.isInteger(value)) {
    return `:${value}\r\n`;
  }

  if (Array.isArray(value)) {
    return `*${value.length}\r\n${value.map(encode).join('')}`;
  }

  const text = String(value);
  return `$${Buffer.byteLength(text)}\r\n${text}\r\n`;
}

function error(message) {
  return { kind: 'error', message };
}

function simple(message) {
  return { kind: 'simple', message: String(message) };
}

function commandRequest(parts) {
  const values = parts.map((part) => {
    const text = String(part);
    return `$${Buffer.byteLength(text)}\r\n${text}\r\n`;
  });

  return `*${parts.length}\r\n${values.join('')}`;
}

class RespParser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    const commands = [];
    let offset = 0;

    while (offset < this.buffer.length) {
      const parsed = parseRequestValue(this.buffer, offset);

      if (!parsed) {
        break;
      }

      if (!Array.isArray(parsed.value)) {
        throw new Error('Protocol error: expected an array request');
      }

      commands.push(parsed.value.map((value) => String(value)));
      offset = parsed.offset;
    }

    this.buffer = this.buffer.subarray(offset);
    return commands;
  }
}

function parseRequestValue(buffer, start) {
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

  if (type === '*') {
    const length = parseLength(header);

    if (length === -1) {
      return { value: null, offset: bodyStart };
    }

    const values = [];
    let offset = bodyStart;

    for (let index = 0; index < length; index += 1) {
      const item = parseRequestValue(buffer, offset);

      if (!item) {
        return null;
      }

      values.push(item.value);
      offset = item.offset;
    }

    return { value: values, offset };
  }

  if (type === '$') {
    const length = parseLength(header);

    if (length === -1) {
      return { value: null, offset: bodyStart };
    }

    const bodyEnd = bodyStart + length;

    if (bodyEnd + 2 > buffer.length) {
      return null;
    }

    if (buffer[bodyEnd] !== 13 || buffer[bodyEnd + 1] !== 10) {
      throw new Error('Protocol error: invalid bulk string');
    }

    return {
      value: buffer.toString('utf8', bodyStart, bodyEnd),
      offset: bodyEnd + 2,
    };
  }

  throw new Error('Protocol error: unsupported request type');
}

function parseLength(text) {
  if (!/^-?\d+$/.test(text)) {
    throw new Error('Protocol error: invalid length');
  }

  const length = Number(text);

  if (!Number.isSafeInteger(length) || length < -1) {
    throw new Error('Protocol error: invalid length');
  }

  return length;
}

module.exports = { RespParser, commandRequest, encode, error, simple };
