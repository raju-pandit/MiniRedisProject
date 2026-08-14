'use strict';
const net = require('node:net');
const { Store } = require('./store');
const { SnapshotPersistence } = require('./persistence');
const { createCommandExecutor } = require('./commands');
const { RespParser, encode, error } = require('./resp');

function createServer({ snapshotPath, sweepIntervalMs = 1000 } = {}) {
  const store = new Store();
  const persistence = new SnapshotPersistence(snapshotPath || 'snapshot.json');
  try { persistence.load(store); } catch (err) { throw new Error(`Unable to load snapshot: ${err.message}`); }
  const execute = createCommandExecutor(store, persistence);
  const server = net.createServer((socket) => {
    const parser = new RespParser();
    socket.on('data', (chunk) => {
      try { for (const command of parser.push(chunk)) socket.write(encode(execute(command))); }
      catch (err) { socket.write(encode(error(err.message))); socket.destroy(); }
    });
    socket.on('error', () => {});
  });
  const sweeper = setInterval(() => store.purgeExpired(), sweepIntervalMs);
  sweeper.unref();
  const close = server.close.bind(server);
  server.close = (callback) => { clearInterval(sweeper); persistence.save(store); return close(callback); };
  server.store = store;
  return server;
}
module.exports = { createServer };
