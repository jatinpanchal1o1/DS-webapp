export class ShopifyAdapter {
  constructor(config = {}) { this.config = config; }

  async connect() { return { connected: false, reason: 'OAuth credentials required' }; }
  async importProducts() { return []; }
  async importOrders() { return []; }
  async pushProduct() { throw new Error('Shopify credentials required'); }
  async fulfillOrder() { throw new Error('Shopify credentials required'); }
}
