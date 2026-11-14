import { Router } from 'express';
import express from 'express';
import crypto from 'node:crypto';
import Store from '../models/Store.js';
import Product from '../models/Product.js';
import { auth } from '../middleware/auth.js';
import { parseXlsx, parseMultipart } from '../services/spreadsheetParser.js';

const router = Router();
const keyHash = value => crypto.createHash('sha256').update(value).digest('hex');

function normalize(row) {
  const title = String(row.title || row.name || row.product || '').trim();
  if (!title) return null;
  const costPrice = Number(row.costPrice ?? row.cost ?? row.supplierPrice ?? 0) || 0;
  const sellingPrice = Number(row.sellingPrice ?? row.price ?? row.retailPrice ?? (costPrice ? costPrice * 2 : 0)) || 0;
  const inventory = Math.max(0, Number(row.inventory ?? row.stock ?? row.quantity ?? 0) || 0);
  const images = String(row.images || row.image || row.imageUrl || '').split(/[|;]/).map(x => x.trim()).filter(Boolean);
  const tags = String(row.tags || '').split(/[|,;]/).map(x => x.trim()).filter(Boolean);
  return { title, description: String(row.description || ''), category: String(row.category || ''), brand: String(row.brand || ''), status: String(row.status || 'draft').toLowerCase() === 'published' ? 'published' : 'draft', images, tags, variants: [{ sku: String(row.sku || row.variantSku || '').trim(), title: String(row.variant || row.variantTitle || 'Default'), costPrice, sellingPrice, inventory }] };
}

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows.shift().map(h => h.trim());
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

router.post('/script-key', auth, async (req, res, next) => {
  try {
    const store = await Store.findOne({ _id: req.body.storeId, owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    const raw = `dp_live_${crypto.randomBytes(32).toString('hex')}`;
    store.apiKeys.push({ name: String(req.body.name || 'Product import script').slice(0, 80), prefix: raw.slice(0, 14), hash: keyHash(raw) });
    await store.save();
    res.status(201).json({ apiKey: raw, prefix: raw.slice(0, 14), warning: 'Copy this key now. It will not be shown again.' });
  } catch (error) { next(error); }
});

router.post('/products/:storeSlug', async (req, res, next) => {
  try {
    const supplied = String(req.headers['x-droppilot-key'] || '');
    if (!supplied) return res.status(401).json({ message: 'X-DropPilot-Key header is required' });
    const store = await Store.findOne({ slug: req.params.storeSlug, status: 'active' });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    const key = store.apiKeys.find(item => item.hash === keyHash(supplied));
    if (!key) return res.status(401).json({ message: 'Invalid import API key' });
    key.lastUsedAt = new Date(); await store.save();
    const items = Array.isArray(req.body.products) ? req.body.products : [req.body];
    if (!items.length || items.length > 500) return res.status(400).json({ message: 'Send between 1 and 500 products per request' });
    const operations = items.map(item => {
      const product = normalize(item);
      if (!product) return null;
      const externalId = String(item.externalId || item.id || product.variants[0].sku || '').trim();
      product.store = store._id;
      product.source = { providerId: 'custom-script', externalId, sku: product.variants[0].sku, importedAt: new Date() };
      if (externalId) return { updateOne: { filter: { store: store._id, 'source.providerId': 'custom-script', 'source.externalId': externalId }, update: { $set: product }, upsert: true } };
      return { insertOne: { document: product } };
    }).filter(Boolean);
    if (!operations.length) return res.status(400).json({ message: 'No valid products found. Each product needs a title.' });
    const result = await Product.bulkWrite(operations, { ordered: false });
    res.status(201).json({ received: operations.length, inserted: result.insertedCount || 0, updated: result.modifiedCount || 0, upserted: result.upsertedCount || 0 });
  } catch (error) { next(error); }
});

router.post('/products/file', auth, express.raw({ type: 'multipart/form-data', limit: '12mb' }), async (req, res, next) => {
  try {
    const { fields, file } = parseMultipart(req.body || Buffer.alloc(0), req.headers['content-type'] || '');
    const store = await Store.findOne({ _id: fields.storeId, owner: req.user.userId });
    if (!store) return res.status(404).json({ message: 'Store not found' });
    if (!file) return res.status(400).json({ message: 'Choose a CSV or XLSX file' });
    const ext = file.originalname.toLowerCase().split('.').pop();
    let rows;
    if (ext === 'csv') rows = parseCsv(file.buffer.toString('utf8'));
    else if (ext === 'xlsx') rows = parseXlsx(file.buffer);
    else return res.status(415).json({ message: 'Supported file formats: CSV and XLSX' });
    if (!rows.length || rows.length > 5000) return res.status(400).json({ message: 'The file must contain 1–5,000 product rows' });
    const docs = rows.map(normalize).filter(Boolean).map(product => ({ ...product, store: store._id }));
    if (!docs.length) return res.status(400).json({ message: 'No rows with a product title were found' });
    const result = await Product.insertMany(docs, { ordered: false });
    res.status(201).json({ imported: result.length, skipped: rows.length - docs.length, message: 'Products imported as drafts. Review the catalog before publishing.' });
  } catch (error) { next(error); }
});

export default router;
