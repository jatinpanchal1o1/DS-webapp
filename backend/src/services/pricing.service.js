export function calculateSellingPrice(cost, rules = {}) {
  const percentage = Number(rules.markupPercent || 0);
  const fixed = Number(rules.fixedMarkup || 0);
  const minimumProfit = Number(rules.minimumProfit || 0);
  const minimumMargin = Number(rules.minimumMargin || 0);

  let price = cost + fixed + (cost * percentage / 100);
  price = Math.max(price, cost + minimumProfit);

  if (minimumMargin > 0 && minimumMargin < 100) {
    price = Math.max(price, cost / (1 - minimumMargin / 100));
  }

  return Math.round(price * 100) / 100;
}
