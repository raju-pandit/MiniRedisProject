'use strict';
const { error, simple } = require('./resp');

function createCommandExecutor(store, persistence) {
  const exact = (args, count, name) => args.length === count ? null : error(`wrong number of arguments for '${name}' command`);
  const save = (reply) => { persistence.save(store); return reply; };
  const safe = (callback) => { try { return callback(); } catch (err) { return { __respError: true, message: err.message }; } };
  return (parts) => {
    if (!parts.length) return error('empty command');
    const name = parts[0].toUpperCase(); const args = parts.slice(1); let bad;
    switch (name) {
      case 'PING': return args.length === 0 ? simple('PONG') : args.length === 1 ? args[0] : error("wrong number of arguments for 'ping' command");
      case 'SET': if ((bad = exact(args, 2, 'set'))) return bad; return save((store.set(args[0], args[1]), simple('OK')));
      case 'GET': if ((bad = exact(args, 1, 'get'))) return bad; return safe(() => { const e = store.getTyped(args[0], 'string'); return e ? e.value : null; });
      case 'DEL': if (!args.length) return error("wrong number of arguments for 'del' command"); return save(args.reduce((sum, key) => sum + store.delete(key), 0));
      case 'EXISTS': if (!args.length) return error("wrong number of arguments for 'exists' command"); return args.reduce((sum, key) => sum + store.exists(key), 0);
      case 'KEYS': if ((bad = exact(args, 1, 'keys'))) return bad; return store.keys(args[0]);
      case 'FLUSHALL': if ((bad = exact(args, 0, 'flushall'))) return bad; return save((store.clear(), simple('OK')));
      case 'EXPIRE': { if ((bad = exact(args, 2, 'expire'))) return bad; const seconds = integer(args[1]); return seconds === null ? error('value is not an integer or out of range') : save(store.expire(args[0], seconds)); }
      case 'TTL': if ((bad = exact(args, 1, 'ttl'))) return bad; return store.ttl(args[0]);
      case 'PERSIST': if ((bad = exact(args, 1, 'persist'))) return bad; return save(store.persist(args[0]));
      case 'TYPE': if ((bad = exact(args, 1, 'type'))) return bad; { const e = store.getEntry(args[0]); return simple(e ? e.type : 'none'); }
      case 'LPUSH': return listPush(args, store, persistence, true);
      case 'RPUSH': return listPush(args, store, persistence, false);
      case 'LPOP': return listPop(args, store, persistence, true);
      case 'RPOP': return listPop(args, store, persistence, false);
      case 'LLEN': if ((bad = exact(args, 1, 'llen'))) return bad; return safe(() => { const e = store.getTyped(args[0], 'list'); return e ? e.value.length : 0; });
      case 'LRANGE': return lrange(args, store);
      case 'HSET': return hset(args, store, persistence);
      case 'HGET': if ((bad = exact(args, 2, 'hget'))) return bad; return safe(() => { const e = store.getTyped(args[0], 'hash'); return e ? (e.value.get(args[1]) ?? null) : null; });
      case 'HDEL': return hdel(args, store, persistence);
      case 'HEXISTS': if ((bad = exact(args, 2, 'hexists'))) return bad; return safe(() => { const e = store.getTyped(args[0], 'hash'); return e && e.value.has(args[1]) ? 1 : 0; });
      case 'HLEN': if ((bad = exact(args, 1, 'hlen'))) return bad; return safe(() => { const e = store.getTyped(args[0], 'hash'); return e ? e.value.size : 0; });
      case 'HGETALL': if ((bad = exact(args, 1, 'hgetall'))) return bad; return safe(() => { const e = store.getTyped(args[0], 'hash'); return e ? [...e.value.entries()].flat() : []; });
      case 'SAVE': if ((bad = exact(args, 0, 'save'))) return bad; persistence.save(store); return simple('OK');
      default: return error(`unknown command '${parts[0]}'`);
    }
  };
}

function listPush(args, store, persistence, left) {
  if (args.length < 2) return error(`wrong number of arguments for '${left ? 'lpush' : 'rpush'}' command`);
  try { const e = store.getTyped(args[0], 'list', () => []); left ? e.value.unshift(...args.slice(1)) : e.value.push(...args.slice(1)); persistence.save(store); return e.value.length; } catch (err) { return { __respError: true, message: err.message }; }
}
function listPop(args, store, persistence, left) {
  if (args.length !== 1) return error(`wrong number of arguments for '${left ? 'lpop' : 'rpop'}' command`);
  try { const e = store.getTyped(args[0], 'list'); if (!e) return null; const value = left ? e.value.shift() : e.value.pop(); if (!e.value.length) store.delete(args[0]); persistence.save(store); return value ?? null; } catch (err) { return { __respError: true, message: err.message }; }
}
function lrange(args, store) {
  if (args.length !== 3) return error("wrong number of arguments for 'lrange' command"); const start = integer(args[1]); const stop = integer(args[2]);
  if (start === null || stop === null) return error('value is not an integer or out of range');
  try { const e = store.getTyped(args[0], 'list'); if (!e) return []; const size = e.value.length; const from = start < 0 ? Math.max(size + start, 0) : start; const to = stop < 0 ? size + stop : stop; return from > to || from >= size ? [] : e.value.slice(from, to + 1); } catch (err) { return { __respError: true, message: err.message }; }
}
function hset(args, store, persistence) {
  if (args.length < 3 || args.length % 2 === 0) return error("wrong number of arguments for 'hset' command");
  try { const e = store.getTyped(args[0], 'hash', () => new Map()); let added = 0; for (let i = 1; i < args.length; i += 2) { if (!e.value.has(args[i])) added += 1; e.value.set(args[i], args[i + 1]); } persistence.save(store); return added; } catch (err) { return { __respError: true, message: err.message }; }
}
function hdel(args, store, persistence) {
  if (args.length < 2) return error("wrong number of arguments for 'hdel' command");
  try { const e = store.getTyped(args[0], 'hash'); if (!e) return 0; let removed = 0; for (const field of args.slice(1)) if (e.value.delete(field)) removed += 1; if (!e.value.size) store.delete(args[0]); persistence.save(store); return removed; } catch (err) { return { __respError: true, message: err.message }; }
}
function integer(value) { return /^-?\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null; }
module.exports = { createCommandExecutor };
