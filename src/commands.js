'use strict';

const { error, simple } = require('./resp');

function createCommandExecutor(store, persistence) {
  function save(reply) {
    persistence.save(store);
    return reply;
  }

  function runSafely(action) {
    try {
      return action();
    } catch (err) {
      return error(err.message);
    }
  }

  return function execute(parts) {
    if (!parts.length) {
      return error('empty command');
    }

    const command = parts[0].toUpperCase();
    const args = parts.slice(1);

    switch (command) {
      case 'PING':
        return ping(args);
      case 'SET':
        return set(args, store, save);
      case 'GET':
        return get(args, store, runSafely);
      case 'DEL':
        return del(args, store, save);
      case 'EXISTS':
        return exists(args, store);
      case 'KEYS':
        return keys(args, store);
      case 'FLUSHALL':
        return flushAll(args, store, save);
      case 'TYPE':
        return type(args, store);
      case 'EXPIRE':
        return expire(args, store, save);
      case 'TTL':
        return ttl(args, store);
      case 'PERSIST':
        return persist(args, store, save);
      case 'LPUSH':
        return pushToList(args, store, persistence, true);
      case 'RPUSH':
        return pushToList(args, store, persistence, false);
      case 'LPOP':
        return popFromList(args, store, persistence, true);
      case 'RPOP':
        return popFromList(args, store, persistence, false);
      case 'LLEN':
        return listLength(args, store, runSafely);
      case 'LRANGE':
        return listRange(args, store, runSafely);
      case 'HSET':
        return setHashFields(args, store, persistence);
      case 'HGET':
        return getHashField(args, store, runSafely);
      case 'HDEL':
        return deleteHashFields(args, store, persistence);
      case 'HEXISTS':
        return hashFieldExists(args, store, runSafely);
      case 'HLEN':
        return hashLength(args, store, runSafely);
      case 'HGETALL':
        return getAllHashFields(args, store, runSafely);
      case 'SAVE':
        return saveSnapshot(args, persistence, store);
      default:
        return error(`unknown command '${parts[0]}'`);
    }
  };
}

function ping(args) {
  if (args.length === 0) {
    return simple('PONG');
  }

  return args.length === 1 ? args[0] : wrongArity('ping');
}

function set(args, store, save) {
  if (args.length !== 2) {
    return wrongArity('set');
  }

  store.set(args[0], args[1]);
  return save(simple('OK'));
}

function get(args, store, runSafely) {
  if (args.length !== 1) {
    return wrongArity('get');
  }

  return runSafely(() => {
    const entry = store.getTyped(args[0], 'string');
    return entry ? entry.value : null;
  });
}

function del(args, store, save) {
  if (!args.length) {
    return wrongArity('del');
  }

  const deleted = args.reduce((count, key) => count + store.delete(key), 0);
  return save(deleted);
}

function exists(args, store) {
  if (!args.length) {
    return wrongArity('exists');
  }

  return args.reduce((count, key) => count + store.exists(key), 0);
}

function keys(args, store) {
  return args.length === 1 ? store.keys(args[0]) : wrongArity('keys');
}

function flushAll(args, store, save) {
  if (args.length !== 0) {
    return wrongArity('flushall');
  }

  store.clear();
  return save(simple('OK'));
}

function type(args, store) {
  if (args.length !== 1) {
    return wrongArity('type');
  }

  const entry = store.getEntry(args[0]);
  return simple(entry ? entry.type : 'none');
}

function expire(args, store, save) {
  if (args.length !== 2) {
    return wrongArity('expire');
  }

  const seconds = toInteger(args[1]);

  if (seconds === null) {
    return error('value is not an integer or out of range');
  }

  return save(store.expire(args[0], seconds));
}

function ttl(args, store) {
  return args.length === 1 ? store.ttl(args[0]) : wrongArity('ttl');
}

function persist(args, store, save) {
  return args.length === 1 ? save(store.persist(args[0])) : wrongArity('persist');
}

function pushToList(args, store, persistence, fromLeft) {
  const command = fromLeft ? 'lpush' : 'rpush';

  if (args.length < 2) {
    return wrongArity(command);
  }

  try {
    const entry = store.getTyped(args[0], 'list', () => []);
    const values = args.slice(1);

    if (fromLeft) {
      entry.value.unshift(...values);
    } else {
      entry.value.push(...values);
    }

    persistence.save(store);
    return entry.value.length;
  } catch (err) {
    return error(err.message);
  }
}

function popFromList(args, store, persistence, fromLeft) {
  const command = fromLeft ? 'lpop' : 'rpop';

  if (args.length !== 1) {
    return wrongArity(command);
  }

  try {
    const entry = store.getTyped(args[0], 'list');

    if (!entry) {
      return null;
    }

    const value = fromLeft ? entry.value.shift() : entry.value.pop();

    if (entry.value.length === 0) {
      store.delete(args[0]);
    }

    persistence.save(store);
    return value ?? null;
  } catch (err) {
    return error(err.message);
  }
}

function listLength(args, store, runSafely) {
  if (args.length !== 1) {
    return wrongArity('llen');
  }

  return runSafely(() => {
    const entry = store.getTyped(args[0], 'list');
    return entry ? entry.value.length : 0;
  });
}

function listRange(args, store, runSafely) {
  if (args.length !== 3) {
    return wrongArity('lrange');
  }

  const start = toInteger(args[1]);
  const stop = toInteger(args[2]);

  if (start === null || stop === null) {
    return error('value is not an integer or out of range');
  }

  return runSafely(() => {
    const entry = store.getTyped(args[0], 'list');

    if (!entry) {
      return [];
    }

    const list = entry.value;
    const first = start < 0 ? Math.max(list.length + start, 0) : start;
    const last = stop < 0 ? list.length + stop : stop;

    if (first > last || first >= list.length) {
      return [];
    }

    return list.slice(first, last + 1);
  });
}

function setHashFields(args, store, persistence) {
  if (args.length < 3 || args.length % 2 === 0) {
    return wrongArity('hset');
  }

  try {
    const entry = store.getTyped(args[0], 'hash', () => new Map());
    let added = 0;

    for (let index = 1; index < args.length; index += 2) {
      const field = args[index];
      const value = args[index + 1];

      if (!entry.value.has(field)) {
        added += 1;
      }

      entry.value.set(field, value);
    }

    persistence.save(store);
    return added;
  } catch (err) {
    return error(err.message);
  }
}

function getHashField(args, store, runSafely) {
  if (args.length !== 2) {
    return wrongArity('hget');
  }

  return runSafely(() => {
    const entry = store.getTyped(args[0], 'hash');
    return entry ? (entry.value.get(args[1]) ?? null) : null;
  });
}

function deleteHashFields(args, store, persistence) {
  if (args.length < 2) {
    return wrongArity('hdel');
  }

  try {
    const entry = store.getTyped(args[0], 'hash');

    if (!entry) {
      return 0;
    }

    let deleted = 0;

    for (const field of args.slice(1)) {
      if (entry.value.delete(field)) {
        deleted += 1;
      }
    }

    if (entry.value.size === 0) {
      store.delete(args[0]);
    }

    persistence.save(store);
    return deleted;
  } catch (err) {
    return error(err.message);
  }
}

function hashFieldExists(args, store, runSafely) {
  if (args.length !== 2) {
    return wrongArity('hexists');
  }

  return runSafely(() => {
    const entry = store.getTyped(args[0], 'hash');
    return entry && entry.value.has(args[1]) ? 1 : 0;
  });
}

function hashLength(args, store, runSafely) {
  if (args.length !== 1) {
    return wrongArity('hlen');
  }

  return runSafely(() => {
    const entry = store.getTyped(args[0], 'hash');
    return entry ? entry.value.size : 0;
  });
}

function getAllHashFields(args, store, runSafely) {
  if (args.length !== 1) {
    return wrongArity('hgetall');
  }

  return runSafely(() => {
    const entry = store.getTyped(args[0], 'hash');
    return entry ? [...entry.value.entries()].flat() : [];
  });
}

function saveSnapshot(args, persistence, store) {
  if (args.length !== 0) {
    return wrongArity('save');
  }

  persistence.save(store);
  return simple('OK');
}

function wrongArity(command) {
  return error(`wrong number of arguments for '${command}' command`);
}

function toInteger(value) {
  if (!/^-?\d+$/.test(value)) {
    return null;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

module.exports = { createCommandExecutor };
