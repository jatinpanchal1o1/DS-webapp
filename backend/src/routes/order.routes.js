import { Router } from 'express';
import Order from '../models/Order.js';
import Store from '../models/Store.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const stores = await Store.find({ owner: req.user.userId }).select('_id');
    res.json(await Order.find({ store: { $in: stores.map(s => s._id) } }).sort({ createdAt: -1 }).limit(100));
  } catch (err) { next(err); }
});

export default router;
