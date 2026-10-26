import express from 'express';
import * as db from './db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  res.json(await db.listUsers({ page }));
});

router.get('/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(user);
});

router.post('/', async (req, res) => {
  const user = await db.createUser(req.body);
  res.status(201).json(user);
});

router.delete('/:id', async (req, res) => {
  await db.removeUser(req.params.id);
  res.sendStatus(204);
});

export default router;
