import { Router } from 'express';

const router = Router();

router.get('/download/:name{.:ext}', (req, res) => {
  const ext = req.params.ext ?? 'pdf';
  res.sendFile(`${req.params.name}.${ext}`, { root: '/var/files', dotfiles: 'deny' });
});

router.get('/posts/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).send('id must be an integer');
    return;
  }
  res.json({ id });
});

router.get('/static/*splat', (req, res) => {
  res.send('static ' + req.params.splat.join('/'));
});

router.get('/old', (req, res) => {
  res.redirect(301, '/new');
});

router.post('/login', async (req, res) => {
  res.redirect(req.get('Referrer') || '/');
});

router.get('/lang', (req, res) => {
  const lang = req.acceptsLanguages('en', 'fr') || 'en';
  const query = { ...req.query, lang };
  res.json(query);
});

export default router;
