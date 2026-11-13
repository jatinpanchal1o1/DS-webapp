export async function syncInventory() {
  // Connect this worker to a real queue/cron runner in production.
  // Never perform large supplier synchronization inside an HTTP request.
  console.log('Inventory synchronization worker ready');
}
