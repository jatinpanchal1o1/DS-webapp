import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSellingPrice } from '../src/services/pricing.service.js';
test('percentage markup', () => assert.equal(calculateSellingPrice(10, { markupPercent: 40 }), 14));
test('minimum profit is enforced', () => assert.equal(calculateSellingPrice(10, { minimumProfit: 5 }), 15));
test('minimum margin is enforced', () => assert.equal(calculateSellingPrice(10, { minimumMargin: 50 }), 20));
