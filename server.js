const dgram = require('dgram');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');

const UDP_PORT = 20777;
const WS_PORT = 3000;
const HTTP_PORT = 8080;

const app = express();
const wss = new WebSocket.Server({ port: WS_PORT });

let telemetryData = {
  speed: 0, throttle: 0, brake: 0, rpm: 0, gear: 0,
  lap: '--', position: 0, pitLap: '--', rejoinPos: '--',
  tyreWear: '--', avgLapTime: '--', fastestLap: '--',
  leaderPace: '--', gapToLeader: '--'
};

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.send(`
    <h1 style="color:#00ffcc">🚗 F1 25 Telemetry Server ✅</h1>
    <p><strong>UDP:</strong> ${UDP_PORT} | <strong>WS:</strong> ${WS_PORT}</p>
    <p><a href="/dashboard.html" style="color:#00ffcc;font-size:1.2em">📊 Apri Dashboard</a></p>
    <script>setTimeout(() => location.href='/dashboard.html', 2000);</script>
  `);
});

const udpServer = dgram.createSocket('udp4');

udpServer.on('message', (msg) => {
  try {
    if (msg.length < 24) return;

    const packetFormat = msg.readUInt16LE(22); // F1 25 = 2025
    if (packetFormat !== 2025) return;

    const packetId = msg.readUInt8(4);
    
    // MOTION DATA (Packet ID 0)
    if (packetId === 0) {
      telemetryData.speed = Math.round(msg.readFloatLE(68) * 3.6); // m/s → km/h
    }
    
    // LAP DATA (Packet ID 2) 
    if (packetId === 2) {
      telemetryData.lap = msg.readUInt16LE(1160);
      telemetryData.position = msg.readUInt8(1164);
    }
    
    // CAR TELEMETRY (Packet ID 6)
    if (packetId === 6) {
      telemetryData.rpm = msg.readUInt16LE(282);
      telemetryData.throttle = Math.round(msg.readFloatLE(286) * 100);
      telemetryData.brake = Math.round(msg.readFloatLE(290) * 100);
      telemetryData.gear = msg.readInt8(318);
    }

    // Broadcast a tutti i client
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(telemetryData));
      }
    });
  } catch (e) {
    // Ignora errori di parsing
  }
});

udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log('\n🚀 F1 25 TELEMETRY SERVER ATTIVO!');
  console.log('📡 UDP:', `port ${UDP_PORT}`);
  console.log('🌐 WebSocket:', `ws://localhost:${WS_PORT}`);
  console.log('📱 Dashboard:', `http://localhost:${HTTP_PORT}`);
  console.log('\n🎮 F1 25 SETTINGS → Telemetry:');
  console.log('   UDP IP: 127.0.0.1');
  console.log('   UDP Port: 20777');
  console.log('   Send Rate: 60 Hz');
  console.log('   Format: 2025');
  console.log('\n🏁 AVVIA UNA GARA!');
});

udpServer.bind(UDP_PORT, '0.0.0.0');

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(telemetryData));
  console.log('👤 Client WebSocket connesso');
});

app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log('🌐 HTTP Server:', `http://localhost:${HTTP_PORT}`);
});
