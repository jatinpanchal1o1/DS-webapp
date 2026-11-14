// Contract for adding a provider-specific adapter.
// Implement every operation only against the provider's approved official API.
export class ProviderAdapter {
  constructor({ credentials, storeId }) {
    this.credentials = credentials;
    this.storeId = storeId;
  }

  async testConnection() { throw new Error('Implement provider authentication test'); }
  async searchProducts(query) { throw new Error('Implement product discovery if provider permits it'); }
  async getProduct(externalProductId) { throw new Error('Implement product detail lookup'); }
  async getInventory(externalVariantId) { throw new Error('Implement inventory lookup'); }
  async createFulfillmentOrder(order) { throw new Error('Implement fulfillment order submission'); }
  async getTracking(externalOrderId) { throw new Error('Implement shipment tracking lookup'); }
  async verifyWebhook(request) { throw new Error('Implement provider webhook signature verification'); }
}
