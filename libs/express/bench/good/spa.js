import express from 'express';
import path from 'node:path';

const app = express();
const dist = path.resolve('dist');

app.use(express.static(dist));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/{*splat}', (req, res) => {
  res.sendFile('index.html', { root: dist });
});

app.listen(8080, (error) => {
  if (error) throw error;
});
