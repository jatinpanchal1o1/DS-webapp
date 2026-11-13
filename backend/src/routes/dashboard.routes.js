import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

const router = Router();

router.get('/summary', auth, async (req, res, next) => {
  try {
    const stores = await Store.find({ owner: req.user.userId }).select('_id');
    const ids = stores.map(s => s._id);
    const [products, orders, revenue] = await Promise.all([
      Product.countDocuments({ store: { $in: ids } }),
      Order.countDocuments({ store: { $in: ids } }),
      Order.aggregate([
        { $match: { store: { $in: ids } } },
        { $group: { _id: null, total: { $sum: '$totals.total' }, profit: { $sum: '$totals.profit' } } }
      ])
    ]);
    res.json({ stores: stores.length, products, orders, revenue: revenue[0]?.total || 0, profit: revenue[0]?.profit || 0 });
  } catch (err) { next(err); }
});

export default router;
