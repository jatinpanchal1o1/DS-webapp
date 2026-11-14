import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  currency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'UTC' },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  apiKeys: [{ name: String, prefix: String, hash: String, createdAt: { type: Date, default: Date.now }, lastUsedAt: Date }]
}, { timestamps: true });

export default mongoose.model('Store', storeSchema);
