const fs = require("fs");
const WebSocket = require("ws");
const STDIN = 0;
const RATE = 20; // echo rate in hz

function printUsage() {
    console.error("Capture and echo binary websocket messages to base64 text.");
    console.error("Capture usage: node ws-util.js capture hostname:port");
    console.error(`  node ws-util.js capture localhost:10272 > out.bin`);
    console.error("Echo usage: node ws-util.js echo port");
    console.error(`  node ws-util.js echo 10272 < out.bin`);
}

function capture(url) {
    const socket = new WebSocket(url);
    socket.on("message", function(message) {
        console.log(message.toString("base64"));
    });
}

function echo(port) {
    const data = fs.readFileSync(STDIN, "ascii");
    const lines = data.split(/\r\n|\r|\n/g);
    const server = new WebSocket.Server({
        port,
        binaryType: "arraybuffer"
    });
    server.on("connection", function(socket) {
        let index = 0;
        setInterval(function() {
            socket.send(Buffer.from(lines[index], "base64"));
            index = (index + 1) % lines.length;
        }, 1000 / RATE);
    });
}

(function() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        printUsage();
        process.exit(1);
    }
    if (args[0].startsWith("c")) {
        console.error("Waiting for messages...");
        capture(args[1]);
        return;
    }
    if (args[0].startsWith("e")) {
        console.error("Sending messages from standard input...");
        echo(Number.parseInt(args[1]));
        return;
    }
    printUsage();
    process.exit(1);
})();
