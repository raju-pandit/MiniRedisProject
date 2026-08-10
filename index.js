const net = require("net");
const Parser = require("redis-parser");

const store = {};


const server = net.createServer((connection) => {
  console.log("Client connected...");

  
  const parser = new Parser({
    returnReply: (reply) => {

      if (!Array.isArray(reply) || reply.length === 0) return;

      const command = reply[0].toUpperCase();
      const key = reply[1];
      const value = reply[2];

      console.log(`Received command: ${command}, Key: ${key}, Value: ${value}`);

      switch (command) {
        case "PING":
          connection.write("+PONG\r\n");
          break;

        case "SET":
          if (!key || value === undefined) {
            connection.write(
              "-ERR wrong number of arguments for 'set' command\r\n",
            );
          } else {
            store[key] = value;
            connection.write("+OK\r\n");
          }
          break;

        case "GET":
          if (!key) {
            connection.write(
              "-ERR wrong number of arguments for 'get' command\r\n",
            );
          } else {
            const result = store[key];
            if (result === undefined) {
             
              connection.write("$-1\r\n");
            } else {
             
              connection.write(
                `$${Buffer.byteLength(result)}\r\n${result}\r\n`,
              );
            }
          }
          break;

        default:
          connection.write(`-ERR unknown command '${command}'\r\n`);
          break;
      }
    },
    returnError: (err) => {
      console.error("Parser Error:", err.message);
      connection.write(`-ERR ${err.message}\r\n`);
    },
  });

  connection.on("data", (data) => {
    
    parser.execute(data);
  });

  connection.on("end", () => {
    console.log("Client disconnected");
  });

  connection.on("error", (err) => {
    console.error("Socket Error:", err.message);
  });
});


const PORT = 8000;

server.listen(PORT, () => {
  console.log(`Custom Redis server running on port ${PORT}`);
});
