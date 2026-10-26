import express from 'express';
import { renderToStaticNodeStream } from 'react-dom/server';
import { EmailTemplate } from './EmailTemplate';

const app = express();

app.get('/email-preview', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  const stream = renderToStaticNodeStream(<EmailTemplate name={req.query.name} />);
  stream.pipe(res);
});

app.listen(3000);
