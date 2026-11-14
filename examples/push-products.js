// Run from a trusted server or scheduled job, never from browser code.
// Set DROPPILOT_API_URL, DROPPILOT_STORE_SLUG and DROPPILOT_IMPORT_KEY.
const apiUrl = process.env.DROPPILOT_API_URL;
const storeSlug = process.env.DROPPILOT_STORE_SLUG;
const importKey = process.env.DROPPILOT_IMPORT_KEY;

if (!apiUrl || !storeSlug || !importKey) {
  throw new Error('Set DROPPILOT_API_URL, DROPPILOT_STORE_SLUG and DROPPILOT_IMPORT_KEY');
}

const supplierFeed = [
  {
    externalId: 'supplier-1001',
    title: 'Wireless Desk Lamp',
    description: 'Adjustable warm light for focused work.',
    sku: 'LAMP-001',
    costPrice: 12.5,
    sellingPrice: 29.99,
    inventory: 80,
    category: 'Home & Living',
    imageUrl: 'https://example.com/lamp.jpg'
  }
];

const response = await fetch(`${apiUrl}/api/v1/import/products/${storeSlug}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-DropPilot-Key': importKey
  },
  body: JSON.stringify({ products: supplierFeed })
});

const result = await response.json();
if (!response.ok) throw new Error(result.message || `Import failed: ${response.status}`);
console.log('DropPilot import result:', result);
