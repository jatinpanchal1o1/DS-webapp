export class WooCommerceAdapter {
  constructor(config = {}) { this.config = config; }

  async connect() { return { connected: false, reason: 'API credentials required' }; }
  async importProducts() { return []; }
  async importOrders() { return []; }
  async pushProduct() { throw new Error('WooCommerce credentials required'); }
  async fulfillOrder() { throw new Error('WooCommerce credentials required'); }
}
