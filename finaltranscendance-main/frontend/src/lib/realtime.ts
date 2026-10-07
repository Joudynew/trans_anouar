type ChangeHandler = () => void;

let socket: WebSocket | null = null;
let socketToken: string | null = null;

const handlers = new Set<ChangeHandler>();

function getToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function getWsUrl(token: string): string | null {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    return null;
  }

  const url = new URL(apiUrl, window.location.origin);

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.searchParams.set('token', token);

  return url.toString();
}

/**
 * Opens the socket only when a user is logged in (the server rejects
 * anonymous connections), and re-opens it when the token changes
 * (login / logout / account switch). Checked every 2 seconds.
 */
function ensureConnection(): void {
  const token = getToken();

  // Logged out or switched account: close the current socket.
  if (socket && token !== socketToken) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }

  if (!token || socket) {
    return;
  }

  const wsUrl = getWsUrl(token);
  if (!wsUrl) {
    return;
  }

  socketToken = token;
  socket = new WebSocket(wsUrl);

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
  };
}

ensureConnection();
setInterval(ensureConnection, 2000);

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
