const dgram = require('dgram');
const WebSocket = require('ws');
const express = require('express');
const { createPacketDecoder } = require('udp4-packet');

const UDP_PORT = 20777;
const WS_PORT = 3000;
const HTTP_PORT = 8080;

const app = express();
const wss = new WebSocket.Server({ port: WS_PORT });
let telemetryData = {
  speed: 0,
  throttle: 0,
  brake: 0,
  pitLap: '--',
  rejoinPos: '--',
  tyreWear: '--',
  avgLapTime: '--',
  fastestLap: '--',
  leaderPace: '--',
  rpm: 0,
  gear: 0,
  lap: 0,
  position: 0
};

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.send(`
    <h1>🚗 F1 25 Telemetry Server</h1>
    <p>✅ UDP listening on port ${UDP_PORT}</p>
    <p>✅ WebSocket on ws://localhost:${WS_PORT}</p>
    <p><a href="/dashboard.html">📊 Apri Dashboard</a></p>
    <script>setTimeout(() => location.href='/dashboard.html', 2000);</script>
  `);
});

const server = dgram.createSocket('udp4');
const decoder = createPacketDecoder();

server.on('message', (msg) => {
  try {
    const packet = decoder.decode(msg);
    
    // F1 25 Motion Packet (primo pacchetto tipico)
    if (packet.header && packet.header.packetId === 0) {
      telemetryData.speed = packet.vehicleF1TelemetryData[0]?.speed || 0;
      telemetryData.throttle = packet.vehicleF1TelemetryData[0]?.throttle * 100;
      telemetryData.brake = packet.vehicleF1TelemetryData[0]?.brake * 100;
      telemetryData.rpm = packet.vehicleF1TelemetryData[0]?.engineRPM || 0;
      telemetryData.gear = packet.vehicleF1TelemetryData[0]?.gear || 0;
    }
    
    // Lap Data Packet
    if (packet.header && packet.header.packetId === 2) {
      telemetryData.lap = packet.lapData[0]?.currentLapNum || 0;
      telemetryData.position = packet.lapData[0]?.carPosition || 0;
    }
    
    // Broadcast a tutti i client WebSocket
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(telemetryData));
      }
    });
  } catch (e) {
    console.log('Parse error:', e.message);
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`\n🚀 F1 25 Telemetry Server AVVIATO!`);
  console.log(`📡 UDP listening: ${address.address}:${address.port}`);
  console.log(`🌐 WebSocket: ws://${address.address}:${WS_PORT}`);
  console.log(`📱 HTTP Dashboard: http://${address.address}:${HTTP_PORT}`);
  console.log(`\n📝 F1 25 → Settings → Telemetry:`);
  console.log(`   UDP IP: ${address.address}`);
  console.log(`   UDP Port: 20777`);
  console.log(`   Format: 2025\n`);
});

server.bind(UDP_PORT, '0.0.0.0');

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(telemetryData));
  console.log('👤 Client WebSocket connesso');
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🌐 HTTP server su http://0.0.0.0:${HTTP_PORT}`);
});
