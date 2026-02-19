const dgram = require('dgram');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const UDP_PORT = 20777;
const WS_PORT = 3000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const udp = dgram.createSocket('udp4');

udp.on('message', (msg) => {
  // Estrai velocità (byte 8-9), throttle (byte 24), freno (byte 26)
  const speed = msg.readUInt16LE(8);
  const throttle = msg.readUInt8(24);
  const brake = msg.readUInt8(26);

  const data = { speed, throttle, brake };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
});

udp.bind(UDP_PORT);
server.listen(WS_PORT, () => {
  console.log(`Server WebSocket attivo su http://localhost:${WS_PORT}`);
});
