// 本地测试用 MQTT over WebSocket 中继（127.0.0.1:8883）
const aedesMod = require('aedes');
const { WebSocketServer, createWebSocketStream } = require('ws');
(async () => {
  const broker = aedesMod.Aedes && aedesMod.Aedes.createBroker ? await aedesMod.Aedes.createBroker() : aedesMod();
  const wss = new WebSocketServer({ host: '127.0.0.1', port: 8883, handleProtocols: p => (p.has('mqtt') ? 'mqtt' : false) });
  wss.on('connection', ws => broker.handle(createWebSocketStream(ws)));
  console.log('mqtt ws on 127.0.0.1:8883');
})();
