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


router.patch('/:id', auth, async (req, res, next) => {
  try {
    const stores = await Store.find({ owner: req.user.userId }).select('_id');
    const allowed = ['title', 'description', 'category', 'brand', 'images', 'tags', 'variants', 'status', 'seo'];
    const update = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    if (update.title !== undefined) update.title = String(update.title).trim();
    if (update.status && !['draft', 'published', 'archived'].includes(update.status)) return res.status(400).json({ message: 'Invalid product status' });
    if (update.variants && (!Array.isArray(update.variants) || update.variants.length > 200)) return res.status(400).json({ message: 'Variants must be an array with at most 200 entries' });
    const product = await Product.findOneAndUpdate({ _id: req.params.id, store: { $in: stores.map(s => s._id) } }, { $set: update }, { new: true, runValidators: true }).populate('supplier', 'name type status');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) { next(error); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const stores = await Store.find({ owner: req.user.userId }).select('_id');
    const product = await Product.findOneAndDelete({ _id: req.params.id, store: { $in: stores.map(s => s._id) } });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) { next(error); }
});

export default router;
