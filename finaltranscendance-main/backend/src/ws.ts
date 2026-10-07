import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  wss.on('connection', (socket) => {
    console.log('WebSocket client connected');

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'db-changed') {
          broadcast({
            type: 'db-changed',
          });
        }
      } catch {
        console.error('Invalid WebSocket message');
      }
    });

    socket.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    socket.send(
      JSON.stringify({
        type: 'connected',
      })
    );
  });

  console.log('WebSocket server ready on /ws');
}

function broadcast(event: unknown) {
  if (!wss) return;

  const message = JSON.stringify(event);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
