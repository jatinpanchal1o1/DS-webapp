import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './config/database.js';
import User from './models/User.js';
import Store from './models/Store.js';
import Product from './models/Product.js';
import Supplier from './models/Supplier.js';
import Order from './models/Order.js';
await connectDatabase();
const email = process.env.DEMO_EMAIL || 'demo@droppilot.local';
let user = await User.findOne({ email });
if (!user) user = await User.create({ name: 'Demo Owner', email, passwordHash: await bcrypt.hash(process.env.DEMO_PASSWORD || 'ChangeMe12345!', 12) });
let store = await Store.findOne({ owner: user._id, name: 'Demo Store' });
if (!store) store = await Store.create({ owner: user._id, name: 'Demo Store', slug: `demo-store-${user._id.toString().slice(-6)}` });
let supplier = await Supplier.findOne({ owner: user._id, name: 'Demo Supplier' });
if (!supplier) supplier = await Supplier.create({ owner: user._id, name: 'Demo Supplier', type: 'manual', status: 'disconnected' });
if (!await Product.exists({ store: store._id })) await Product.insertMany([
 { store: store._id, supplier: supplier._id, title: 'Minimal Ceramic Desk Lamp', category: 'Home & Living', status: 'published', variants: [{ sku: 'LAMP-BLK', title: 'Black', costPrice: 12, sellingPrice: 29.99, inventory: 84 }] },
 { store: store._id, supplier: supplier._id, title: 'Everyday Travel Organizer', category: 'Accessories', status: 'draft', variants: [{ sku: 'ORG-GRY', title: 'Grey', costPrice: 6.5, sellingPrice: 18.99, inventory: 120 }] }
]);
if (!await Order.exists({ store: store._id })) await Order.create({ store: store._id, orderNumber: 'DP-10001', customer: { name: 'Alex Morgan', email: 'alex@example.test' }, items: [{ title: 'Minimal Ceramic Desk Lamp', quantity: 1, price: 29.99, supplierCost: 12 }], totals: { subtotal: 29.99, shipping: 0, tax: 0, discount: 0, total: 29.99, profit: 17.99 }, paymentStatus: 'paid', fulfillmentStatus: 'pending' });
console.log(`Demo data ready. Login: ${email} / ${process.env.DEMO_PASSWORD || 'ChangeMe12345!'}`);
process.exit(0);
