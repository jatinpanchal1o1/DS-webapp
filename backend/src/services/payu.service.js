import crypto from 'node:crypto';

// PayU India request hash. The merchant salt must only exist on the API server.
export function generatePayUHash(params, salt = process.env.PAYU_SALT) {
  if (!salt) throw new Error('PAYU_SALT is not configured');
  const required = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email'];
  for (const field of required) {
    if (params[field] === undefined || params[field] === null || String(params[field]).trim() === '') {
      throw new Error(`Missing PayU field: ${field}`);
    }
  }
  const udf = [1,2,3,4,5].map(n => params[`udf${n}`] || '');
  const hashString = [params.key, params.txnid, params.amount, params.productinfo,
    params.firstname, params.email, ...udf, '', '', '', '', '', '', salt].join('|');
  return crypto.createHash('sha512').update(hashString, 'utf8').digest('hex');
}

export function verifyPayUResponse(params, salt = process.env.PAYU_SALT) {
  if (!salt || !params.hash) return false;
  const udf = [1,2,3,4,5].map(n => params[`udf${n}`] || '');
  const sequence = [salt, params.status || '', '', '', '', '', ...udf.reverse(),
    params.email || '', params.firstname || '', params.productinfo || '', params.amount || '',
    params.txnid || '', params.key || ''];
  const expected = crypto.createHash('sha512').update(sequence.join('|'), 'utf8').digest();
  let actual;
  try { actual = Buffer.from(params.hash, 'hex'); } catch { return false; }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
