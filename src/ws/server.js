import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from './arcjet.js';

function sendJson(socket, payload) {
  if(socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if(client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 }); //secu measure against memo abuse, if client request is above 1024*1024, it sends a req

  server.on('upgrade', async (req, socket, head) => {
    try {
      if (wsArcjet) {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          if (decision.reason.isRateLimit()) {
            socket.write('HTTP/1.1 429 Too many requests \r\n\r\n');
          } else {
            socket.write('HTTP/1.1 403 Forbidden \r\n\r\n');
          }
          socket.destroy();
          return;
        }
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } catch (e) {
      console.error('WS connection error', e);
      socket.destroy();
    }
  });

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });
    sendJson(socket, { type: 'Welcome to the WebSocket server!' });
    socket.on('error', console.error);  //prevents crash of server when client connection has an error, it logs the error instead
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => { clearInterval(interval); });

  function broadcastMatchCreate(match) {
    broadcast(wss, { type: 'match_created', data: match });
  }

  return { broadcastMatchCreate };
}
