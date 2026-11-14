import mongoose from 'mongoose';
const integrationConnectionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  providerId: { type: String, required: true },
  displayName: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['needs_credentials', 'connected', 'error', 'disconnected', 'approval_required'], default: 'needs_credentials' },
  encryptedCredentials: { type: mongoose.Schema.Types.Mixed, select: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastTestAt: Date,
  lastSyncAt: Date,
  lastError: String
}, { timestamps: true });
integrationConnectionSchema.index({ owner: 1, store: 1, providerId: 1 }, { unique: true });
export default mongoose.model('IntegrationConnection', integrationConnectionSchema);
