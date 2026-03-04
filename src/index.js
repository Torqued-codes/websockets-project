import express from 'express';
import http from 'http';
import { attachWebSocketServer } from './ws/server.js';
import { matchesRouter } from './routes/matches.js';

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Hello from Express!' });
});

app.use('/matches', matchesRouter);

const { broadcastMatchCreate } = attachWebSocketServer(server);
app.locals.broadcastMatchCreate = broadcastMatchCreate;


server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server is running on ${baseUrl}/`);
  console.log(`WebSocket server is running on ${baseUrl.replace('http', 'ws')}/ws`);
});

