'use strict';

const fs = require('node:fs');
const path = require('node:path');

class SnapshotPersistence {
  constructor(snapshotPath) {
    this.snapshotPath = snapshotPath;
  }

  load(store) {
    if (!fs.existsSync(this.snapshotPath)) {
      return false;
    }

    const fileContents = fs.readFileSync(this.snapshotPath, 'utf8');
    store.load(JSON.parse(fileContents));
    return true;
  }

  save(store) {
    const directory = path.dirname(this.snapshotPath);
    const temporaryPath = `${this.snapshotPath}.tmp`;
    const snapshot = JSON.stringify(store.dump());

    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(temporaryPath, snapshot, 'utf8');
    fs.renameSync(temporaryPath, this.snapshotPath);
  }
}

module.exports = { SnapshotPersistence };
