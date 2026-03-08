import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

const matchSubscribers = new Map();

function subscribeToMatch(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

function unsubscribeFromMatch(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if(!subscribers) return;
  subscribers.delete(socket);
  if(subscribers.size === 0){
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket) {
  for(const matchId of socket.subscriptions){
    unsubscribeFromMatch(matchId, socket);
  }
}

function sendJson(socket, payload) {
  if(socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
  for (const client of wss.clients) {
    if(client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}

function broadcastToMatch(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if(!subscribers || subscribers.size === 0) return;
  const message = JSON.stringify(payload);
  for(const client of subscribers){
    if(client.readyState === WebSocket.OPEN){
      client.send(message);
    }
  }
}

function handleMessage(socket, data) {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch {
    sendJson(socket, { type: 'error', message: 'Invalid JSON' });
  }

  if(message?.type === 'subscribe' && Number.isInteger(message.matchId)){
    subscribeToMatch(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: 'subscribed', matchId: message.matchId });
    return;
  }
  if(message?.type === 'unsubscribe' && Number.isInteger(message.matchId)){
    unsubscribeFromMatch(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: 'unsubscribed', matchId: message.matchId });
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

  wss.on('connection', (socket, req) => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });
    socket.subscriptions = new Set();
    sendJson(socket, { type: 'Welcome to the WebSocket server!' });

    socket.on('message', (data) => {
      handleMessage(socket, data);
    });

    socket.on('error', () => {
      socket.terminate();
    });

    socket.on('close', () => {
      cleanupSubscriptions(socket);
    });

    socket.on('error', console.error); //prevents crash of server when client connection has an error, it logs the error instead
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
    broadcastToAll(wss, { type: 'match_created', data: match });
  }

  function broadcastCommentary(matchId, commentary) {
    broadcastToMatch(matchId, { type: 'new_commentary', data: commentary });
  }

  return { broadcastMatchCreate, broadcastCommentary };
}
