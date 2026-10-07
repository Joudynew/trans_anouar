// CLAUDE-MODIF (2026-10-07) — MODIFIÉ : WebSocket authentifié par JWT (?token=), diffusion limitée à la même organisation.
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'node:http';
import { verifyAuthToken } from './lib/jwt.js';
import { prisma } from './lib/prisma.js';

interface ClientInfo {
  userId: string;
  organizationId: string | null;
}

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, ClientInfo>();

// The browser cannot set an Authorization header on a WebSocket, so the JWT
// is passed as a query parameter: wss://host/ws?token=...
async function authenticate(req: IncomingMessage): Promise<ClientInfo | null> {
  try {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) return null;

    const { userId } = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') return null;

    return { userId, organizationId: user.organizationId };
  } catch {
    return null;
  }
}

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 4 * 1024,
  });

  wss.on('connection', async (socket, req) => {
    const info = await authenticate(req);

    if (!info) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    clients.set(socket, info);

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Only notify users of the same organization.
        if (message?.type === 'db-changed') {
          broadcastToOrg(info.organizationId, { type: 'db-changed' });
        }
      } catch {
        // Ignore malformed messages.
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    socket.send(JSON.stringify({ type: 'connected' }));
  });

  console.log('WebSocket server ready on /ws');
}

function broadcastToOrg(organizationId: string | null, event: unknown) {
  if (!wss) return;

  const message = JSON.stringify(event);

  for (const [client, info] of clients) {
    if (client.readyState === WebSocket.OPEN && info.organizationId === organizationId) {
      client.send(message);
    }
  }
}
