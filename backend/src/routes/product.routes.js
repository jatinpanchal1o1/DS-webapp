import { Router } from 'express';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const stores = await Store.find({ owner: req.user.userId }).select('_id');
    res.json(await Product.find({ store: { $in: stores.map(s => s._id) } }).populate('supplier', 'name type status').sort({ createdAt: -1 }));
  } catch (err) { next(err); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const store = await Store.findOne({ _id: req.body.storeId, owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Product title is required' });
    let supplierId;
    if (req.body.supplierId) {
      const Supplier = (await import('../models/Supplier.js')).default;
      const supplier = await Supplier.findOne({ _id: req.body.supplierId, owner: req.user.userId }).select('_id');
      if (!supplier) return res.status(400).json({ message: 'Supplier is not available in this workspace' });
      supplierId = supplier._id;
    }
    const product = await Product.create({
      store: store._id,
      supplier: supplierId,
      title,
      description: req.body.description || '',
      category: req.body.category || '',
      status: req.body.status || 'draft',
      variants: Array.isArray(req.body.variants) ? req.body.variants : []
    });
    res.status(201).json(product);
  } catch (err) { next(err); }
});

export default router;
