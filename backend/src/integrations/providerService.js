import { getProvider } from './providerRegistry.js';

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || (body.code !== undefined && ![0, 200].includes(Number(body.code)))) {
    throw new Error(body.message || `Provider request failed (${response.status})`);
  }
  return body;
}

export async function testProvider(providerId, credentials) {
  if (providerId === 'cj-dropshipping') {
    if (!credentials.apiKey) throw new Error('CJ API Key is required');
    const response = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: credentials.apiKey }), signal: AbortSignal.timeout(15000)
    });
    const result = await readJson(response);
    if (!result.data?.accessToken) throw new Error('CJ did not return an access token');
    return { status: 'connected', credentials: { ...credentials, accessToken: result.data.accessToken, refreshToken: result.data.refreshToken, accessTokenExpiryDate: result.data.accessTokenExpiryDate, refreshTokenExpiryDate: result.data.refreshTokenExpiryDate }, message: 'CJ API authentication successful' };
  }
  if (providerId === 'shipbob') {
    if (!credentials.apiToken) throw new Error('ShipBob API token is required');
    const base = credentials.environment === 'sandbox' ? 'https://sandbox-api.shipbob.com' : 'https://api.shipbob.com';
    const response = await fetch(`${base}/2026-07/channel`, { headers: { Authorization: `Bearer ${credentials.apiToken}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    await readJson(response);
    return { status: 'connected', credentials, message: 'ShipBob API authentication successful' };
  }
  const provider = getProvider(providerId);
  if (!provider) throw new Error('Unknown provider');
  const required = provider.fields.filter(field => field.secret).map(field => field.key);
  const missing = required.filter(field => !credentials[field]);
  if (missing.length) throw new Error(`Missing credentials: ${missing.join(', ')}`);
  throw new Error(`${provider.name} credentials saved. A live API test requires the provider's approved API access and an enabled connector adapter. This connection is not marked live.`);
}

export async function searchProviderProducts(providerId, credentials, { keyword = '', page = 1, size = 20 } = {}) {
  if (providerId !== 'cj-dropshipping') throw new Error('Product search adapter is not yet enabled for this provider. Use CSV/XLSX or the provider API connector when approved.');
  let token = credentials.accessToken;
  if (!token || (credentials.accessTokenExpiryDate && new Date(credentials.accessTokenExpiryDate).getTime() < Date.now() + 60000)) {
    if (credentials.refreshToken) {
      const refresh = await fetch(`${CJ_BASE}/authentication/refreshAccessToken`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: credentials.refreshToken }), signal: AbortSignal.timeout(15000) });
      const refreshed = await readJson(refresh);
      token = refreshed.data.accessToken;
      credentials.accessToken = token;
      credentials.refreshToken = refreshed.data.refreshToken || credentials.refreshToken;
      credentials.accessTokenExpiryDate = refreshed.data.accessTokenExpiryDate;
      credentials.refreshTokenExpiryDate = refreshed.data.refreshTokenExpiryDate;
    } else {
      const auth = await testProvider(providerId, credentials);
      Object.assign(credentials, auth.credentials);
      token = credentials.accessToken;
    }
  }
  const url = new URL(`${CJ_BASE}/product/listV2`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(Math.min(Math.max(size, 1), 100)));
  if (keyword) url.searchParams.set('keyWord', keyword);
  url.searchParams.set('features', 'enable_description,enable_category');
  const response = await fetch(url, { headers: { 'CJ-Access-Token': token }, signal: AbortSignal.timeout(20000) });
  const result = await readJson(response);
  const content = result.data?.content || [];
  return { credentials, products: content.flatMap(item => item.productList || []), total: result.data?.totalRecords || 0 };
}
