import express from 'express';
import { matchesRouter } from './routes/matches.js';

const app = express();
const PORT = 8000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send({ message: 'Hello from Express!' });
});

app.use('/matches', matchesRouter);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
});

