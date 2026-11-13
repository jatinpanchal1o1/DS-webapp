import { Router } from 'express';
import crypto from 'node:crypto';
import { auth } from '../middleware/auth.js';
import { generatePayUHash, verifyPayUResponse } from '../services/payu.service.js';

const router = Router();
router.post('/payu/hash', auth, async (req, res, next) => {
  try {
    if (!process.env.PAYU_KEY || !process.env.PAYU_SALT) return res.status(503).json({ message: 'PayU is not configured on this server' });
    const { amount, productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5 } = req.body;
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: 'Amount must be greater than zero' });
    const params = { key: process.env.PAYU_KEY, txnid: crypto.randomUUID().replaceAll('-', '').slice(0, 20), amount: numericAmount.toFixed(2), productinfo, firstname, email, udf1, udf2, udf3, udf4, udf5 };
    res.json({ ...params, hash: generatePayUHash(params), action: process.env.PAYU_BASE_URL || 'https://test.payu.in', surl: process.env.PAYU_SUCCESS_URL, furl: process.env.PAYU_FAILURE_URL });
  } catch (error) { next(error); }
});
router.post('/payu/return', async (req, res) => {
  const valid = verifyPayUResponse(req.body);
  res.status(valid ? 200 : 400).json({ verified: valid, status: valid ? req.body.status : 'unverified' });
});
export default router;
