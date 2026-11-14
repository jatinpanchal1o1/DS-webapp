import crypto from 'node:crypto';

function key() {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be set to at least 32 characters');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptCredentials(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: encrypted.toString('base64') };
}

export function decryptCredentials(payload) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(payload.data, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(plain);
}
