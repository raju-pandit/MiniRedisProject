'use strict';
const fs = require('node:fs');
const path = require('node:path');

class SnapshotPersistence {
  constructor(snapshotPath) { this.snapshotPath = snapshotPath; }
  load(store) {
    if (!fs.existsSync(this.snapshotPath)) return false;
    store.load(JSON.parse(fs.readFileSync(this.snapshotPath, 'utf8'))); return true;
  }
  save(store) {
    fs.mkdirSync(path.dirname(this.snapshotPath), { recursive: true });
    const temporaryPath = `${this.snapshotPath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(store.dump()), 'utf8');
    fs.renameSync(temporaryPath, this.snapshotPath);
  }
}
module.exports = { SnapshotPersistence };
