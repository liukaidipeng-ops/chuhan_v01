// 本地测试用 MQTT-over-WebSocket 中继
const aedes = require('aedes')();
const { WebSocketServer, createWebSocketStream } = require('ws');
const wss = new WebSocketServer({ host: '127.0.0.1', port: +(process.env.PORT || 8883), handleProtocols: p => (p.has('mqtt') ? 'mqtt' : false) });
wss.on('connection', ws => aedes.handle(createWebSocketStream(ws)));
wss.on('listening', () => console.log('mqtt ws on', wss.address()));
