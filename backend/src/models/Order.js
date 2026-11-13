import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  orderNumber: { type: String, required: true },
  customer: {
    name: String,
    email: String,
    phone: String
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: String,
    quantity: Number,
    price: Number,
    supplierCost: Number
  }],
  totals: {
    subtotal: Number,
    shipping: Number,
    tax: Number,
    discount: Number,
    total: Number,
    profit: Number
  },
  paymentStatus: { type: String, default: 'pending' },
  fulfillmentStatus: { type: String, default: 'pending' },
  trackingNumber: String,
  paymentTransactionId: { type: String, index: true },
  paymentGateway: String,
  paymentResponse: mongoose.Schema.Types.Mixed
}, { timestamps: true });

orderSchema.index({ store: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ store: 1, createdAt: -1 });
orderSchema.index({ store: 1, paymentStatus: 1, fulfillmentStatus: 1 });
export default mongoose.model('Order', orderSchema);
