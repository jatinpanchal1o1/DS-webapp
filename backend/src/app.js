import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import storeRoutes from './routes/store.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import storefrontRoutes from './routes/storefront.routes.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(x => x.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'droppilot-api', version: '1.0.0', time: new Date().toISOString() }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/stores', storeRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/storefront', storefrontRoutes);
app.use((req, res) => res.status(404).json({ message: 'API route not found' }));
app.use((err, req, res, next) => {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error({ message: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  res.status(status).json({ message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error' });
});
export default app;
