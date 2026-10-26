import express from 'express';
import path from 'node:path';

const app = express();
const dist = path.resolve('dist');

app.use(express.static(dist));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Send index.html for every client-side route
app.get('*', (req, res) => {
  res.sendfile(path.join(dist, 'index.html'));
});

app.listen(8080);
