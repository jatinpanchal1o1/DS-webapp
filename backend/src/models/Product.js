import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  sku: String,
  title: String,
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  inventory: { type: Number, default: 0 }
}, { _id: true });

const productSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  title: { type: String, required: true },
  slug: { type: String, index: true },
  brand: String,
  source: { providerId: String, externalId: String, sku: String, importedAt: Date },
  seo: { title: String, description: String, handle: String },
  description: String,
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  images: [String],
  category: String,
  tags: [String],
  variants: [variantSchema],
  sync: {
    inventory: { type: Boolean, default: true },
    price: { type: Boolean, default: true }
  }
}, { timestamps: true });

productSchema.index({ store: 1, status: 1, createdAt: -1 });
productSchema.index({ store: 1, 'variants.sku': 1 });
productSchema.index({ store: 1, 'source.providerId': 1, 'source.externalId': 1 }, { sparse: true });
export default mongoose.model('Product', productSchema);
