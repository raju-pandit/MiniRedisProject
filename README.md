# MiniRedis
#THUNDER HACKATHON 5.0,
MiniRedis is a Redis-inspired in-memory key-value database written in Node.js. It is implemented with Node.js standard libraries only: a custom TCP server, a streaming RESP2 parser, an in-memory storage engine, expiry handling, a JSON snapshot system, and a command-line client.

It is a learning project and local-development tool, not a production replacement for Redis.

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Download and run](#download-and-run)
- [Command reference](#command-reference)
- [Architecture](#architecture)
- [Storage and data structures](#storage-and-data-structures)
- [Concurrency model](#concurrency-model)
- [Persistence](#persistence)
- [Verification](#verification)
- [Limitations](#limitations)

## Features

| Requirement | Status | Implementation |
| --- | --- | --- |
| Custom TCP server | Done | Node.js `net` server listens on a configurable host and port. |
| Multiple clients | Done | Each TCP socket is handled independently by the event loop. |
| `SET`, `GET`, `DEL`, `EXISTS`, `KEYS`, `FLUSHALL` | Done | Core key-value commands. |
| `EXPIRE`, `TTL`, `PERSIST` | Done | Absolute expiry timestamps with active and lazy cleanup. |
| Strings | Done | UTF-8 string values. |
| Lists | Done | Push, pop, length, and range commands. |
| Hashes | Done | Field/value record commands. |
| Snapshot and reload | Done | Atomic JSON snapshot writes and startup reload. |
| CLI client | Done | Send commands from a terminal and view formatted responses. |
| RESP2 request support | Done | Handles fragmented and pipelined array requests. |
| Pub/Sub, transactions, AOF, replication, authentication | Not implemented | Outside the scope of this simplified project. |

## Requirements

- Node.js 18 or newer
- npm, which is installed with Node.js
- Windows PowerShell, Command Prompt, macOS Terminal, or a Linux shell

Confirm Node.js is installed:

```powershell
node --version
npm --version
```

## Download and Run

Repository: [raju-pandit/MiniRedisProject](https://github.com/raju-pandit/MiniRedisProject)

### Option 1: Download as ZIP

1. Open the [GitHub repository](https://github.com/raju-pandit/MiniRedisProject).
2. Click **Code** and choose **Download ZIP**.
3. Extract the archive, for example to `D:\Projects\MiniRedisProject`.
4. Open PowerShell in the extracted folder.

```powershell
cd D:\Projects\MiniRedisProject
npm install
npm start
```

### Option 2: Clone with Git

```powershell
git clone https://github.com/raju-pandit/MiniRedisProject.git
cd MiniRedisProject
npm install
npm start
```

When the server starts, it prints:

```text
MiniRedis listening on 127.0.0.1:8000
```

Leave this first terminal open. Open a second terminal in the same project folder to use the CLI client.

### Quick Client Demo

```powershell
npm run cli -- PING
npm run cli -- SET name Raju
npm run cli -- GET name
npm run cli -- RPUSH fruits apple mango banana
npm run cli -- LRANGE fruits 0 -1
npm run cli -- HSET user:1 name Raju city Delhi
npm run cli -- HGETALL user:1
```

Expected first responses:

```text
PONG
OK
Raju
```

Stop the server with `Ctrl + C`. A final snapshot is saved before a normal shutdown.

### Custom Host, Port, and Snapshot Path

The default server address is `127.0.0.1:8000`, and the default snapshot path is `data/snapshot.json`.

In PowerShell, set a different port:

```powershell
$env:PORT = 6380
npm start
```

Then send commands to that port:

```powershell
npm run cli -- --port 6380 SET message hello
npm run cli -- --port 6380 GET message
```

Use a custom snapshot location:

```powershell
$env:SNAPSHOT_PATH = "D:\MiniRedisData\snapshot.json"
npm start
```

## Command Reference

The general CLI format is:

```powershell
npm run cli -- COMMAND [argument ...]
```

### Core Commands

| Command | Description | Example |
| --- | --- | --- |
| `PING` | Checks whether the server is available. | `PING` |
| `SET key value` | Stores a string. Existing data at the key is replaced. | `SET name Raju` |
| `GET key` | Reads a string; returns `(nil)` if absent. | `GET name` |
| `DEL key [key ...]` | Deletes one or more keys. | `DEL name city` |
| `EXISTS key [key ...]` | Counts the keys that exist. | `EXISTS name city` |
| `KEYS pattern` | Lists matching keys. `*` matches any text and `?` matches one character. | `KEYS user:*` |
| `FLUSHALL` | Deletes every key. Use carefully. | `FLUSHALL` |
| `TYPE key` | Returns `string`, `list`, `hash`, or `none`. | `TYPE name` |

### Expiry Commands

| Command | Description | Example |
| --- | --- | --- |
| `EXPIRE key seconds` | Sets a key's expiry time. | `EXPIRE session:1 60` |
| `TTL key` | Returns remaining seconds. `-1` means no expiry; `-2` means missing. | `TTL session:1` |
| `PERSIST key` | Removes an existing expiry. | `PERSIST session:1` |

```powershell
npm run cli -- SET session:1 active
npm run cli -- EXPIRE session:1 60
npm run cli -- TTL session:1
npm run cli -- PERSIST session:1
```

### List Commands

| Command | Description | Example |
| --- | --- | --- |
| `LPUSH key value [value ...]` | Adds values to the beginning. | `LPUSH tasks first second` |
| `RPUSH key value [value ...]` | Adds values to the end. | `RPUSH tasks first second` |
| `LPOP key` | Removes and returns the first value. | `LPOP tasks` |
| `RPOP key` | Removes and returns the last value. | `RPOP tasks` |
| `LLEN key` | Returns the list length. | `LLEN tasks` |
| `LRANGE key start stop` | Returns values in a range. Use `0 -1` for all values. | `LRANGE tasks 0 -1` |

```powershell
npm run cli -- RPUSH fruits apple mango banana
npm run cli -- LRANGE fruits 0 -1
npm run cli -- LPOP fruits
```

### Hash Commands

| Command | Description | Example |
| --- | --- | --- |
| `HSET key field value [field value ...]` | Creates or updates fields. | `HSET user:1 name Raju city Delhi` |
| `HGET key field` | Reads a field. | `HGET user:1 name` |
| `HDEL key field [field ...]` | Deletes fields. | `HDEL user:1 city` |
| `HEXISTS key field` | Checks if a field exists. | `HEXISTS user:1 name` |
| `HLEN key` | Returns the number of fields. | `HLEN user:1` |
| `HGETALL key` | Returns every field and value. | `HGETALL user:1` |

```powershell
npm run cli -- HSET user:1 name Raju role developer
npm run cli -- HGET user:1 name
npm run cli -- HGETALL user:1
```

### Persistence Command

| Command | Description |
| --- | --- |
| `SAVE` | Immediately saves the current database to the snapshot file. |

## Architecture

```text
CLI / TCP client
      |
      v
TCP server (src/server.js)
      |
      v
Streaming RESP2 parser (src/resp.js)
      |
      v
Command executor (src/commands.js)
      |
      v
Typed in-memory Store (src/store.js)
      |
      v
Snapshot persistence (src/persistence.js) -> data/snapshot.json
```

### Request Flow

1. A client opens a TCP connection and sends a RESP2 array command.
2. The server retains incomplete data, so a command can arrive across multiple network chunks.
3. The parser returns complete commands in order, including pipelined commands.
4. The command executor validates arguments and reads or changes the store.
5. Mutating commands save an updated snapshot.
6. The server encodes the response as RESP2 and sends it back to the client.

## Storage and Data Structures

| Data | Structure | Why it is used |
| --- | --- | --- |
| Database keys | JavaScript `Map` | Fast key lookup and predictable key iteration. |
| String value | JavaScript string | Direct storage for `SET` and `GET`. |
| List value | JavaScript array | Supports ordered push, pop, length, and slicing operations. |
| Hash value | JavaScript `Map` | Efficient field lookup and update for record-like data. |
| Expiry | Absolute timestamp in milliseconds | Enables correct expiry across server restarts. |

Every stored entry has this conceptual shape:

```text
key -> { type, value, expiresAt }
```

`expiresAt` is either an epoch timestamp or `null`. An expired key is deleted when accessed and by a one-second background cleanup sweep.

## Concurrency Model

MiniRedis uses Node.js's event-driven TCP model. Multiple clients can remain connected and send commands concurrently. Each socket has its own parser buffer, so fragmented data from one client cannot affect another client.

JavaScript command execution is synchronous within the event loop. A single command finishes before the next command begins, so an individual mutation is atomic with respect to other commands. This simplified model does not provide Redis transactions or multi-command atomic blocks.

## Persistence

The server writes a JSON snapshot after every mutating command, when `SAVE` is called, and during a normal shutdown.

Save process:

1. Remove expired entries.
2. Convert the store into a serializable snapshot object.
3. Write it to `snapshot.json.tmp`.
4. Rename the temporary file to `snapshot.json`.

Writing to a temporary file before renaming prevents a partially written snapshot from replacing the previous file. At startup, the server loads the snapshot and ignores entries whose expiry time has already passed.

## Verification

Manual verification commands:

```powershell
npm run cli -- SET greeting hello
npm run cli -- GET greeting
npm run cli -- EXPIRE greeting 10
npm run cli -- TTL greeting
npm run cli -- RPUSH queue first second
npm run cli -- LRANGE queue 0 -1
npm run cli -- HSET profile name Raju city Delhi
npm run cli -- HGETALL profile
npm run cli -- SAVE
```

The code can also be checked for JavaScript syntax:

```powershell
node --check index.js
Get-ChildItem src,bin -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

## Limitations

- Data is stored in memory; available RAM limits database size.
- Snapshots are synchronous and can temporarily block the event loop for very large datasets.
- `KEYS` scans every key and is not suitable for very large databases.
- There is no password authentication, TLS encryption, ACL support, or network access control beyond the configured host binding.
- There is no Pub/Sub, transaction support, append-only-file persistence, replication, eviction policy, sets, or sorted sets.
- Values are handled as UTF-8 text by this implementation.

## Project Structure

```text
index.js                 Server entry point
bin/miniredis-cli.js     Terminal client
src/resp.js              RESP2 parser and response encoder
src/commands.js          Command validation and handlers
src/store.js             Typed in-memory storage and expiry
src/persistence.js       Atomic JSON snapshot persistence
src/server.js            TCP connection lifecycle
```
