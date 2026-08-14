'use strict';

const TYPES = new Set(['string', 'list', 'hash']);

class Store {
  constructor() {
    this.entries = new Map();
  }

  set(key, value) {
    this.entries.set(key, {
      type: 'string',
      value: String(value),
      expiresAt: null,
    });
  }

  getEntry(key) {
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    return entry;
  }

  getTyped(key, type, makeValue) {
    let entry = this.getEntry(key);

    if (!entry && makeValue) {
      entry = { type, value: makeValue(), expiresAt: null };
      this.entries.set(key, entry);
    }

    if (!entry) {
      return null;
    }

    if (entry.type !== type) {
      throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    }

    return entry;
  }

  delete(key) {
    return this.entries.delete(key) ? 1 : 0;
  }

  exists(key) {
    return this.getEntry(key) ? 1 : 0;
  }

  clear() {
    this.entries.clear();
  }

  keys(pattern) {
    const matches = globPattern(pattern);
    const keys = [];

    for (const key of this.entries.keys()) {
      if (this.getEntry(key) && matches.test(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  expire(key, seconds) {
    const entry = this.getEntry(key);

    if (!entry) {
      return 0;
    }

    if (seconds <= 0) {
      this.entries.delete(key);
      return 1;
    }

    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  ttl(key) {
    const entry = this.getEntry(key);

    if (!entry) {
      return -2;
    }

    if (entry.expiresAt === null) {
      return -1;
    }

    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }

  persist(key) {
    const entry = this.getEntry(key);

    if (!entry || entry.expiresAt === null) {
      return 0;
    }

    entry.expiresAt = null;
    return 1;
  }

  purgeExpired() {
    for (const key of this.entries.keys()) {
      this.getEntry(key);
    }
  }

  dump() {
    this.purgeExpired();

    const entries = [...this.entries.entries()].map(([key, entry]) => ({
      key,
      type: entry.type,
      value: entry.type === 'hash' ? [...entry.value.entries()] : entry.value,
      expiresAt: entry.expiresAt,
    }));

    return { version: 1, entries };
  }

  load(snapshot) {
    if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.entries)) {
      throw new Error('invalid snapshot format');
    }

    const entries = new Map();

    for (const savedEntry of snapshot.entries) {
      if (!savedEntry || typeof savedEntry.key !== 'string' || !TYPES.has(savedEntry.type)) {
        throw new Error('invalid snapshot entry');
      }

      if (savedEntry.expiresAt !== null && (!Number.isFinite(savedEntry.expiresAt) || savedEntry.expiresAt <= Date.now())) {
        continue;
      }

      const value = savedEntry.type === 'hash' ? new Map(savedEntry.value) : savedEntry.value;

      if (savedEntry.type === 'string' && typeof value !== 'string') {
        throw new Error('invalid string snapshot entry');
      }

      if (savedEntry.type === 'list' && !Array.isArray(value)) {
        throw new Error('invalid list snapshot entry');
      }

      entries.set(savedEntry.key, {
        type: savedEntry.type,
        value,
        expiresAt: savedEntry.expiresAt,
      });
    }

    this.entries = entries;
  }
}

function globPattern(pattern) {
  const escaped = String(pattern)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  return new RegExp(`^${escaped}$`);
}

module.exports = { Store };
