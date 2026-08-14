'use strict';

const net = require('node:net');
const { createCommandExecutor } = require('./commands');
const { SnapshotPersistence } = require('./persistence');
const { RespParser, encode, error } = require('./resp');
const { Store } = require('./store');

function createServer(options = {}) {
  const store = new Store();
  const snapshotPath = options.snapshotPath || 'snapshot.json';
  const sweepIntervalMs = options.sweepIntervalMs || 1000;
  const persistence = new SnapshotPersistence(snapshotPath);

  try {
    persistence.load(store);
  } catch (err) {
    throw new Error(`Unable to load snapshot: ${err.message}`);
  }

  const execute = createCommandExecutor(store, persistence);
  const server = net.createServer((socket) => handleConnection(socket, execute));
  const sweepTimer = setInterval(() => store.purgeExpired(), sweepIntervalMs);

  sweepTimer.unref();

  const close = server.close.bind(server);

  server.close = (callback) => {
    clearInterval(sweepTimer);
    persistence.save(store);
    return close(callback);
  };

  server.store = store;
  return server;
}

function handleConnection(socket, execute) {
  const parser = new RespParser();

  socket.on('data', (chunk) => {
    try {
      const commands = parser.push(chunk);

      for (const command of commands) {
        socket.write(encode(execute(command)));
      }
    } catch (err) {
      socket.write(encode(error(err.message)));
      socket.destroy();
    }
  });

  socket.on('error', () => {});
}

module.exports = { createServer };
