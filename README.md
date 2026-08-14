# MiniRedis

MiniRedis is a small Redis-inspired in-memory database made with Node.js. It is built from scratch: it has its own TCP server, RESP protocol parser, in-memory storage, expiry manager, and JSON snapshot persistence. It does not require Redis or an external database.

This project is suitable for learning how a basic key-value database server works, or for local experiments. It is not intended as a replacement for Redis in production systems.

## Requirements

- Node.js 18 or newer
- npm (included with Node.js)

Verify the installation:

```bash
node --version
npm --version
```

## Download and Run from GitHub (Windows Step-by-Step)

Repository: [raju-pandit/MiniRedisProject](https://github.com/raju-pandit/MiniRedisProject)

### Step 1: Install Node.js

Download and install the **LTS** version of Node.js from [nodejs.org](https://nodejs.org/). During installation, keep the default options enabled.

Open PowerShell and confirm that Node.js and npm are available:

```powershell
node --version
npm --version
```

If both commands show version numbers, continue to Step 2. If PowerShell says `node is not recognized`, close and reopen the terminal after installing Node.js.

### Step 2: Download the Project

Choose one of these methods.

#### Option A: Download ZIP (easiest)

1. Open the [GitHub repository](https://github.com/raju-pandit/MiniRedisProject).
2. Click the green **Code** button.
3. Select **Download ZIP**.
4. Extract the ZIP file anywhere, for example `D:\Projects\MiniRedisProject`.
5. Open the extracted folder in File Explorer.
6. Right-click inside the folder and choose **Open in Terminal** (or open PowerShell and use `cd`).

Example when using PowerShell:

```powershell
cd D:\Projects\MiniRedisProject
```

#### Option B: Clone with Git

If Git is installed, run:

```powershell
git clone https://github.com/raju-pandit/MiniRedisProject.git
cd MiniRedisProject
```

### Step 3: Install the Project

Inside the project folder, run:

```powershell
npm install
```

This project has no runtime dependencies, but this command verifies the Node.js project setup.

### Step 4: Start the Database Server

Run:

```powershell
npm start
```

You should see:

```text
MiniRedis listening on 127.0.0.1:8000
```

Keep this terminal open. The server must remain running while you send commands.

### Step 5: Open a Second Terminal and Send Commands

Open another PowerShell window. Go to the same project folder:

```powershell
cd D:\Projects\MiniRedisProject
```

Now try these commands one by one:

```powershell
npm run cli -- PING
npm run cli -- SET name Raju
npm run cli -- GET name
npm run cli -- RPUSH fruits apple mango banana
npm run cli -- LRANGE fruits 0 -1
npm run cli -- HSET user:1 name Raju city Delhi
npm run cli -- HGETALL user:1
```

Expected basic result:

```text
PONG
OK
Raju
```

### Step 6: Stop the Server

Go back to the server terminal and press:

```text
Ctrl + C
```

Data is automatically saved before the server closes. The next `npm start` reloads it from `data/snapshot.json`.

## Quick Start

If Node.js is already installed and the repository has already been downloaded:

```powershell
cd MiniRedisProject
npm install
npm start
```

Then, in a second terminal:

```powershell
cd MiniRedisProject
npm run cli -- SET greeting hello
npm run cli -- GET greeting
```

## Start the Server

Run the server:

```bash
npm start
```

Expected output:

```text
MiniRedis listening on 127.0.0.1:8000
```

The default server address is:

```text
Host: 127.0.0.1
Port: 8000
```

Keep this terminal running. Open a second terminal in the same project folder to send commands using the CLI.

## Use the CLI Client

Command format:

```bash
npm run cli -- COMMAND argument1 argument2
```

Examples:

```bash
npm run cli -- PING
npm run cli -- SET name Raju
npm run cli -- GET name
npm run cli -- DEL name
```

The CLI connects to `127.0.0.1:8000` by default. To use a different server or port:

```bash
npm run cli -- --host 127.0.0.1 --port 6380 SET name Raju
```

## All Commands

### Basic and String Commands

| Command | Description | Example |
| --- | --- | --- |
| `PING` | Checks whether the server is alive. | `PING` |
| `SET key value` | Stores a string value. Replaces any existing key. | `SET name Raju` |
| `GET key` | Reads a string value. Returns `(nil)` when missing. | `GET name` |
| `DEL key [key ...]` | Deletes one or more keys. | `DEL name city` |
| `EXISTS key [key ...]` | Counts keys that exist. | `EXISTS name city` |
| `KEYS pattern` | Lists matching keys. Supports `*` and `?`. | `KEYS user:*` |
| `FLUSHALL` | Deletes every key in the database. | `FLUSHALL` |
| `TYPE key` | Shows `string`, `list`, `hash`, or `none`. | `TYPE name` |

### Expiry Commands

| Command | Description | Example |
| --- | --- | --- |
| `EXPIRE key seconds` | Deletes a key automatically after the given number of seconds. | `EXPIRE session:1 60` |
| `TTL key` | Returns seconds remaining. `-1` means no expiry and `-2` means missing key. | `TTL session:1` |
| `PERSIST key` | Removes expiry from a key. | `PERSIST session:1` |

Example:

```bash
npm run cli -- SET session:1 active
npm run cli -- EXPIRE session:1 60
npm run cli -- TTL session:1
npm run cli -- PERSIST session:1
```

### List Commands

Lists store ordered string values.

| Command | Description | Example |
| --- | --- | --- |
| `LPUSH key value [value ...]` | Adds values at the beginning of a list. | `LPUSH tasks first second` |
| `RPUSH key value [value ...]` | Adds values at the end of a list. | `RPUSH tasks first second` |
| `LPOP key` | Removes and returns the first value. | `LPOP tasks` |
| `RPOP key` | Removes and returns the last value. | `RPOP tasks` |
| `LLEN key` | Returns the list size. | `LLEN tasks` |
| `LRANGE key start stop` | Returns a range of values. Use `0 -1` for the full list. | `LRANGE tasks 0 -1` |

Example:

```bash
npm run cli -- RPUSH fruits apple mango banana
npm run cli -- LRANGE fruits 0 -1
npm run cli -- LPOP fruits
```

### Hash Commands

Hashes store field/value pairs, useful for user or product records.

| Command | Description | Example |
| --- | --- | --- |
| `HSET key field value [field value ...]` | Sets one or more fields. | `HSET user:1 name Raju city Delhi` |
| `HGET key field` | Reads a field value. | `HGET user:1 name` |
| `HDEL key field [field ...]` | Removes one or more fields. | `HDEL user:1 city` |
| `HEXISTS key field` | Checks whether a field exists. | `HEXISTS user:1 name` |
| `HLEN key` | Returns the number of fields. | `HLEN user:1` |
| `HGETALL key` | Returns all fields and values. | `HGETALL user:1` |

Example:

```bash
npm run cli -- HSET user:1 name Raju role developer
npm run cli -- HGET user:1 name
npm run cli -- HGETALL user:1
```

### Persistence Command

| Command | Description |
| --- | --- |
| `SAVE` | Immediately writes the current data to the snapshot file. |

The server also saves after every write operation (`SET`, `DEL`, list/hash updates, expiry updates, and `FLUSHALL`) and when it is stopped normally with `Ctrl+C`.

## Data Persistence and Restart

By default, data is stored in:

```text
data/snapshot.json
```

When the server restarts, MiniRedis automatically reads this file and restores strings, lists, hashes, and still-valid expiry times.

To use a custom snapshot location in PowerShell:

```powershell
$env:SNAPSHOT_PATH = "D:\my-data\miniredis-snapshot.json"
npm start
```

## Change the Port

To start on port `6380` in PowerShell:

```powershell
$env:PORT = 6380
npm start
```

Then use the same port in the client:

```bash
npm run cli -- --port 6380 SET message hello
npm run cli -- --port 6380 GET message
```

## Project Structure

```text
index.js                 Server entry point
bin/miniredis-cli.js     Command-line client
src/resp.js              RESP2 request parser and reply encoder
src/commands.js          Command validation and implementation
src/store.js             In-memory strings, lists, hashes, and expiry
src/persistence.js       Atomic snapshot save and reload
src/server.js            TCP server and client connection handling
```

## Important Notes

- Each key has one type only: string, list, or hash. Using a list command on a string key returns a `WRONGTYPE` error.
- `FLUSHALL` removes all data, so use it carefully.
- `KEYS *` scans all keys. It is fine for this learning project, but avoid this approach with large production databases.
- Expired keys are removed when accessed and by a background cleanup task that runs every second.
- Multiple TCP clients can connect and send commands at the same time.

## Stop the Server

In the server terminal, press:

```text
Ctrl + C
```

MiniRedis saves a final snapshot before closing.
