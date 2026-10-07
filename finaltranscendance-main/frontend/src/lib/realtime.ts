type ChangeHandler = () => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const handlers = new Set<ChangeHandler>();

function getWsUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not defined');
  }

  const url = new URL(apiUrl);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';

  return url.toString();
}

function connect(): void {
  if (socket && (
    socket.readyState === WebSocket.OPEN ||
    socket.readyState === WebSocket.CONNECTING
  )) {
    return;
  }

  try {
    socket = new WebSocket(getWsUrl());

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'db-changed') {
          handlers.forEach((handler) => handler());
        }
      } catch {
        // Ignore malformed WebSocket messages.
      }
    };

    socket.onclose = () => {
      socket = null;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 2000);
    };

    socket.onerror = () => {
      socket?.close();
    };
  } catch (error) {
    console.error('[WS] connection error:', error);
  }
}

connect();

export function notifyDbChange(): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: 'db-changed',
      })
    );
  }
}

export function subscribeToChanges(
  handler: ChangeHandler
): () => void {
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
  };
}