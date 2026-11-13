import { Router } from 'express';
import Supplier from '../models/Supplier.js';
import { auth } from '../middleware/auth.js';
const router = Router();
router.use(auth);
router.get('/', async (req, res, next) => { try { res.json(await Supplier.find({ owner: req.user.userId }).sort({ createdAt: -1 })); } catch (e) { next(e); } });
router.post('/', async (req, res, next) => { try {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Supplier name is required' });
  const supplier = await Supplier.create({ owner: req.user.userId, name, type: req.body.type || 'manual', settings: req.body.settings || {} });
  res.status(201).json(supplier);
} catch (e) { next(e); } });
router.patch('/:id', async (req, res, next) => { try {
  const allowed = ['name', 'type', 'status', 'settings'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const supplier = await Supplier.findOneAndUpdate({ _id: req.params.id, owner: req.user.userId }, { $set: update }, { new: true, runValidators: true });
  if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
  res.json(supplier);
} catch (e) { next(e); } });
export default router;
