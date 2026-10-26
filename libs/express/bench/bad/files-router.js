import { Router } from 'express';

const router = Router();

router.get('/download/:name.:ext?', (req, res) => {
  const ext = req.params.ext || 'pdf';
  res.sendFile(`${req.params.name}.${ext}`, { root: '/var/files' });
});

router.get('/posts/:id(\\d+)', async (req, res) => {
  res.json({ id: Number(req.params.id) });
});

router.get('/static/*', (req, res) => {
  res.send('static ' + req.params[0]);
});

export default router;
