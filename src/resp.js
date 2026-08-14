'use strict';

function encode(value) {
  if (value && value.__respError) return `-${value.message}\r\n`;
  if (value && value.__respSimple) return `+${value.message}\r\n`;
  if (value === null || value === undefined) return '$-1\r\n';
  if (Number.isInteger(value)) return `:${value}\r\n`;
  if (Array.isArray(value)) return `*${value.length}\r\n${value.map(encode).join('')}`;
  const text = String(value);
  return `$${Buffer.byteLength(text)}\r\n${text}\r\n`;
}

function error(message) { return { __respError: true, message: `ERR ${message}` }; }
function simple(message) { return { __respSimple: true, message: String(message) }; }

class RespParser {
  constructor() { this.buffer = Buffer.alloc(0); }
  push(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const commands = []; let offset = 0;
    while (offset < this.buffer.length) {
      const result = parseValue(this.buffer, offset);
      if (!result) break;
      if (!Array.isArray(result.value)) throw new Error('Protocol error: expected array request');
      commands.push(result.value.map((item) => String(item)));
      offset = result.offset;
    }
    this.buffer = this.buffer.subarray(offset);
    return commands;
  }
}

function parseValue(buffer, start) {
  if (start >= buffer.length) return null;
  const prefix = String.fromCharCode(buffer[start]);
  const lineEnd = buffer.indexOf('\r\n', start);
  if (lineEnd === -1) return null;
  const header = buffer.toString('utf8', start + 1, lineEnd); const afterLine = lineEnd + 2;
  if (prefix === '*') {
    const count = parseLength(header); if (count === -1) return { value: null, offset: afterLine };
    const values = []; let offset = afterLine;
    for (let index = 0; index < count; index += 1) { const item = parseValue(buffer, offset); if (!item) return null; values.push(item.value); offset = item.offset; }
    return { value: values, offset };
  }
  if (prefix === '$') {
    const length = parseLength(header); if (length === -1) return { value: null, offset: afterLine };
    const end = afterLine + length; if (end + 2 > buffer.length) return null;
    if (buffer[end] !== 13 || buffer[end + 1] !== 10) throw new Error('Protocol error: invalid bulk string');
    return { value: buffer.toString('utf8', afterLine, end), offset: end + 2 };
  }
  if (prefix === '+' || prefix === ':') return { value: header, offset: afterLine };
  throw new Error('Protocol error: unsupported request type');
}

function parseLength(text) {
  if (!/^-?\d+$/.test(text)) throw new Error('Protocol error: invalid length');
  const value = Number(text); if (!Number.isSafeInteger(value) || value < -1) throw new Error('Protocol error: invalid length');
  return value;
}

function commandRequest(parts) { return `*${parts.length}\r\n${parts.map((part) => { const text = String(part); return `$${Buffer.byteLength(text)}\r\n${text}\r\n`; }).join('')}`; }
module.exports = { encode, error, simple, RespParser, commandRequest };
