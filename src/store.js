'use strict';

const VALID_TYPES = new Set(['string', 'list', 'hash']);

class Store {
  constructor() { this.entries = new Map(); }
  getEntry(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) { this.entries.delete(key); return null; }
    return entry;
  }
  set(key, value) { this.entries.set(key, { type: 'string', value: String(value), expiresAt: null }); }
  delete(key) { return this.entries.delete(key) ? 1 : 0; }
  exists(key) { return this.getEntry(key) ? 1 : 0; }
  keys(pattern = '*') { const matcher = globToRegExp(pattern); return [...this.entries.keys()].filter((key) => this.getEntry(key) && matcher.test(key)); }
  clear() { this.entries.clear(); }
  expire(key, seconds) {
    const entry = this.getEntry(key); if (!entry) return 0;
    if (seconds <= 0) { this.entries.delete(key); return 1; }
    entry.expiresAt = Date.now() + seconds * 1000; return 1;
  }
  ttl(key) {
    const entry = this.getEntry(key); if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }
  persist(key) { const entry = this.getEntry(key); if (!entry || entry.expiresAt === null) return 0; entry.expiresAt = null; return 1; }
  getTyped(key, type, createValue) {
    let entry = this.getEntry(key);
    if (!entry && createValue !== undefined) { entry = { type, value: createValue(), expiresAt: null }; this.entries.set(key, entry); }
    if (!entry) return null;
    if (entry.type !== type) throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return entry;
  }
  purgeExpired() { for (const key of this.entries.keys()) this.getEntry(key); }
  dump() {
    this.purgeExpired();
    return { version: 1, entries: [...this.entries.entries()].map(([key, entry]) => ({ key, type: entry.type, value: entry.type === 'hash' ? [...entry.value.entries()] : entry.value, expiresAt: entry.expiresAt })) };
  }
  load(snapshot) {
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.entries)) throw new Error('invalid snapshot format');
    const next = new Map();
    for (const item of snapshot.entries) {
      if (!item || typeof item.key !== 'string' || !VALID_TYPES.has(item.type)) throw new Error('invalid snapshot entry');
      if (item.expiresAt !== null && (!Number.isFinite(item.expiresAt) || item.expiresAt <= Date.now())) continue;
      const value = item.type === 'hash' ? new Map(item.value) : item.value;
      if (item.type === 'list' && !Array.isArray(value)) throw new Error('invalid list snapshot entry');
      if (item.type === 'string' && typeof value !== 'string') throw new Error('invalid string snapshot entry');
      next.set(item.key, { type: item.type, value, expiresAt: item.expiresAt });
    }
    this.entries = next;
  }
}

function globToRegExp(pattern) { return new RegExp(`^${String(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`); }
module.exports = { Store };
