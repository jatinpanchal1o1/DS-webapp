import { Router } from 'express';
import crypto from 'node:crypto';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { generatePayUHash, verifyPayUResponse } from '../services/payu.service.js';

const router = Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const store = await Store.findOne({ slug: req.params.slug, status: 'active' }).select('name slug currency');
    if (!store) return res.status(404).json({ message: 'Store not found' });
    const filter = { store: store._id, status: 'published' };
    const search = String(req.query.q || '').trim().slice(0, 100);
    const category = String(req.query.category || '').trim().slice(0, 80);
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ title: { $regex: escaped, $options: 'i' } }, { description: { $regex: escaped, $options: 'i' } }, { category: { $regex: escaped, $options: 'i' } }, { tags: { $regex: escaped, $options: 'i' } }];
    }
    if (category && category !== 'All categories') filter.category = category;
    const sort = req.query.sort === 'price-low' ? { 'variants.0.sellingPrice': 1 }
      : req.query.sort === 'price-high' ? { 'variants.0.sellingPrice': -1 }
      : { createdAt: -1 };
    const products = await Product.find(filter)
      .select('title slug description category images variants tags createdAt')
      .sort(sort).limit(100).lean();
    res.json({ store, products });
  } catch (err) { next(err); }
});

router.post('/:slug/checkout', async (req, res, next) => {
  try {
    if (!process.env.PAYU_KEY || !process.env.PAYU_SALT) return res.status(503).json({ message: 'PayU is not configured on this server' });
    const store = await Store.findOne({ slug: req.params.slug, status: 'active' });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    const { customer = {}, items = [] } = req.body;
    const requested = Array.isArray(items) ? items : [];
    if (!customer.name || !customer.email || !Array.isArray(requested) || requested.length === 0) return res.status(400).json({ message: 'Customer details and cart items are required' });

    const ids = requested.map(i => i.productId);
    const products = await Product.find({ _id: { $in: ids }, store: store._id, status: 'published' });
    const byId = new Map(products.map(p => [String(p._id), p]));
    const orderItems = [];
    let subtotal = 0;
    let profit = 0;
    for (const line of requested) {
      const p = byId.get(String(line.productId));
      const variant = p?.variants?.find(v => String(v._id) === String(line.variantId)) || p?.variants?.[0];
      const quantity = Math.max(1, Math.min(20, Number(line.quantity) || 1));
      if (!p || !variant || variant.inventory < quantity || variant.sellingPrice <= 0) return res.status(400).json({ message: `Product unavailable: ${line.productId}` });
      const price = Number(variant.sellingPrice);
      const cost = Number(variant.costPrice || 0);
      orderItems.push({ product: p._id, title: `${p.title}${variant.title ? ` - ${variant.title}` : ''}`, quantity, price, supplierCost: cost });
      subtotal += price * quantity;
      profit += (price - cost) * quantity;
    }
    const total = Number(subtotal.toFixed(2));
    const orderNumber = `DP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const txnid = crypto.randomUUID().replaceAll('-', '').slice(0, 20);
    const order = await Order.create({ store: store._id, orderNumber, customer: { name: customer.name, email: customer.email, phone: customer.phone }, items: orderItems, totals: { subtotal: total, shipping: 0, tax: 0, discount: 0, total, profit }, paymentStatus: 'pending', fulfillmentStatus: 'pending', paymentTransactionId: txnid });
    const params = { key: process.env.PAYU_KEY, txnid, amount: total.toFixed(2), productinfo: `${store.name} order ${orderNumber}`, firstname: customer.name, email: customer.email, udf1: String(order._id), udf2: String(store._id), udf3: '', udf4: '', udf5: '' };
    res.json({ orderId: order._id, orderNumber, ...params, hash: generatePayUHash(params), action: process.env.PAYU_BASE_URL || 'https://test.payu.in/_payment', surl: process.env.PAYU_SUCCESS_URL || `${process.env.API_PUBLIC_URL || 'http://localhost:5000'}/api/v1/storefront/payu/return`, furl: process.env.PAYU_FAILURE_URL || `${process.env.API_PUBLIC_URL || 'http://localhost:5000'}/api/v1/storefront/payu/return` });
  } catch (err) { next(err); }
});

router.post('/payu/return', async (req, res) => {
  const verified = verifyPayUResponse(req.body);
  const frontend = process.env.CLIENT_PUBLIC_URL || process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
  if (!verified) return res.redirect(`${frontend}/payment/result?status=failed&message=Payment%20verification%20failed`);
  const orderId = req.body.udf1;
  const order = await Order.findById(orderId);
  if (order) {
    order.paymentStatus = String(req.body.status).toLowerCase() === 'success' ? 'paid' : 'failed';
    order.paymentGateway = 'payu';
    order.paymentResponse = { mihpayid: req.body.mihpayid, status: req.body.status, unmappedstatus: req.body.unmappedstatus };
    await order.save();
  }
  const status = order?.paymentStatus === 'paid' ? 'success' : 'failed';
  res.redirect(`${frontend}/payment/result?status=${status}&order=${encodeURIComponent(order?.orderNumber || '')}`);
});

router.get('/orders/:orderId', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId).select('orderNumber customer.name totals.total paymentStatus fulfillmentStatus createdAt');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { next(err); }
});

export default router;
