import { Router } from 'express';
import Store from '../models/Store.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res, next) => {
  try {
    res.json(await Store.find({ owner: req.user.userId }).sort({ createdAt: -1 }));
  } catch (err) { next(err); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'Store name is required' });
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
    const store = await Store.create({ owner: req.user.userId, name, slug });
    res.status(201).json(store);
  } catch (err) { next(err); }
});

export default router;
