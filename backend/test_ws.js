const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001/api/llm/chat/ws?token=mock_token');

ws.on('open', () => {
  console.log('Connected!');
  ws.close();
});

ws.on('error', (err) => {
  console.error('Connection failed:', err);
});

ws.on('close', (code, reason) => {
    console.log(`Closed: ${code} ${reason}`);
});
