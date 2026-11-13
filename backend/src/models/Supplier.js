import mongoose from 'mongoose';
const supplierSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['api', 'csv', 'xml', 'json', 'manual'], default: 'manual' },
  status: { type: String, enum: ['connected', 'disconnected', 'error'], default: 'disconnected' },
  credentials: { type: mongoose.Schema.Types.Mixed, default: {}, select: false },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastSyncAt: Date, lastError: String
}, { timestamps: true });
supplierSchema.index({ owner: 1, name: 1 }, { unique: true });
export default mongoose.model('Supplier', supplierSchema);
