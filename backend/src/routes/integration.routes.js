import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import Store from '../models/Store.js';
import IntegrationConnection from '../models/IntegrationConnection.js';
import { PROVIDERS, getProvider } from '../integrations/providerRegistry.js';
import { encryptCredentials, decryptCredentials } from '../services/credentialVault.js';
import { searchProviderProducts, testProvider } from '../integrations/providerService.js';
import Product from '../models/Product.js';

const router = Router();
router.use(auth);

async function ownedStore(userId, storeId) {
  const query = storeId ? { _id: storeId, owner: userId } : { owner: userId };
  return Store.findOne(query).sort({ createdAt: 1 });
}

router.get('/providers', (req, res) => res.json(PROVIDERS.map(({ fields, ...provider }) => ({ ...provider, fields: fields.map(({ key, label, secret }) => ({ key, label, secret })) }))));
router.get('/', async (req, res, next) => {
  try {
    const stores = await Store.find({ owner: req.user.userId }).select('_id');
    const items = await IntegrationConnection.find({ owner: req.user.userId, store: { $in: stores.map(s => s._id) } }).select('-encryptedCredentials').sort({ updatedAt: -1 });
    res.json(items);
  } catch (error) { next(error); }
});

router.post('/:providerId/connect', async (req, res, next) => {
  try {
    const provider = getProvider(req.params.providerId);
    if (!provider) return res.status(404).json({ message: 'Provider is not supported' });
    const store = await ownedStore(req.user.userId, req.body.storeId);
    if (!store) return res.status(404).json({ message: 'Create a store before connecting providers' });
    const credentials = req.body.credentials || {};
    const missing = provider.fields.filter(field => field.secret && !credentials[field.key]);
    if (missing.length) return res.status(400).json({ message: `Required fields: ${missing.map(field => field.label).join(', ')}` });
    let status = provider.status === 'api-ready' && ['cj-dropshipping', 'shipbob'].includes(provider.id) ? 'needs_credentials' : 'approval_required';
    let safeMessage = 'Credentials saved. Provider approval or API adapter activation is still required.';
    let storedCredentials = credentials;
    if (['cj-dropshipping', 'shipbob'].includes(provider.id)) {
      try {
        const tested = await testProvider(provider.id, credentials);
        status = tested.status;
        storedCredentials = tested.credentials;
        safeMessage = tested.message;
      } catch (error) {
        if (/Missing credentials/.test(error.message) || /required/.test(error.message)) return res.status(400).json({ message: error.message });
        status = 'error';
        safeMessage = error.message;
      }
    }
    const connection = await IntegrationConnection.findOneAndUpdate(
      { owner: req.user.userId, store: store._id, providerId: provider.id },
      { $set: { displayName: provider.name, category: provider.category, status, encryptedCredentials: encryptCredentials(storedCredentials), lastTestAt: new Date(), lastError: status === 'error' ? safeMessage : undefined, metadata: { capabilities: provider.capabilities, docs: provider.docs } } },
      { upsert: true, new: true, runValidators: true }
    ).select('-encryptedCredentials');
    res.status(201).json({ connection, message: safeMessage });
  } catch (error) { next(error); }
});

router.post('/:id/test', async (req, res, next) => {
  try {
    const connection = await IntegrationConnection.findOne({ _id: req.params.id, owner: req.user.userId }).select('+encryptedCredentials');
    if (!connection) return res.status(404).json({ message: 'Integration not found' });
    const credentials = decryptCredentials(connection.encryptedCredentials);
    const tested = await testProvider(connection.providerId, credentials);
    connection.status = tested.status;
    connection.encryptedCredentials = encryptCredentials(tested.credentials);
    connection.lastTestAt = new Date(); connection.lastError = undefined;
    await connection.save();
    res.json({ message: tested.message, status: connection.status });
  } catch (error) { next(error); }
});

router.post('/:id/sync-products', async (req, res, next) => {
  try {
    const connection = await IntegrationConnection.findOne({ _id: req.params.id, owner: req.user.userId }).select('+encryptedCredentials');
    if (!connection) return res.status(404).json({ message: 'Integration not found' });
    if (connection.providerId !== 'cj-dropshipping') return res.status(400).json({ message: 'Product catalog sync is currently implemented for CJ Dropshipping. Other providers are shown as connector-ready until their approved API adapters are enabled.' });
    const credentials = decryptCredentials(connection.encryptedCredentials);
    const result = await searchProviderProducts(connection.providerId, credentials, { keyword: String(req.body.keyword || ''), page: Number(req.body.page || 1), size: Number(req.body.size || 20) });
    connection.encryptedCredentials = encryptCredentials(result.credentials);
    connection.lastSyncAt = new Date(); connection.status = 'connected'; connection.lastError = undefined;
    await connection.save();
    const store = await Store.findOne({ _id: connection.store, owner: req.user.userId });
    const imported = [];
    for (const item of result.products) {
      const sourceId = String(item.id || item.sku || '');
      if (!sourceId) continue;
      const existing = await Product.findOne({ store: store._id, supplier: null, 'source.providerId': connection.providerId, 'source.externalId': sourceId });
      const cost = Number(item.nowPrice || item.sellPrice || 0);
      const payload = { store: store._id, title: item.nameEn || item.sku || 'Imported CJ product', description: item.description || '', category: item.threeCategoryName || '', images: item.bigImage ? [item.bigImage] : [], status: 'draft', source: { providerId: connection.providerId, externalId: sourceId, sku: item.sku || '' }, variants: [{ sku: item.sku || sourceId, title: 'Default', costPrice: cost, sellingPrice: Math.round(cost * 2.2 * 100) / 100, inventory: Number(item.totalVerifiedInventory ?? item.warehouseInventoryNum ?? 0) }] };
      const product = existing ? await Product.findByIdAndUpdate(existing._id, { $set: payload }, { new: true }) : await Product.create(payload);
      imported.push(product._id);
    }
    res.json({ imported: imported.length, totalFound: result.total, productIds: imported, message: `${imported.length} products imported as drafts. Review pricing, images and shipping before publishing.` });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await IntegrationConnection.findOneAndDelete({ _id: req.params.id, owner: req.user.userId });
    if (!deleted) return res.status(404).json({ message: 'Integration not found' });
    res.json({ message: 'Integration disconnected' });
  } catch (error) { next(error); }
});
export default router;
