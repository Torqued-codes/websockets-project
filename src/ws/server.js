import { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
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
    const wss = new WebSocketServer({ server, path: '/ws' , maxPayload: 1024 * 1024 });  //secu measure against memo abuse, if client request is above 1024*1024, it sends a req
    wss.on('connection', (socket) => {
        socket.isAlive = true;
        socket.on('pong', () => {
            socket.isAlive = true;
        });
        sendJson(socket, { type: 'Welcome to the WebSocket server!' });
        socket.on('error', console.error);       //prevents crash of server when client connection has an error, it logs the error instead
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
    });


    function broadcastMatchCreate(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreate };
}



