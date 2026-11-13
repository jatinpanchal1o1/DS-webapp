export class SupplierConnector {
  constructor(config = {}) {
    this.config = config;
  }

  async searchProducts() { throw new Error('Not implemented'); }
  async getProduct() { throw new Error('Not implemented'); }
  async getInventory() { throw new Error('Not implemented'); }
  async getShippingRates() { throw new Error('Not implemented'); }
  async createOrder() { throw new Error('Not implemented'); }
  async cancelOrder() { throw new Error('Not implemented'); }
  async getOrderStatus() { throw new Error('Not implemented'); }
  async getTracking() { throw new Error('Not implemented'); }
}
