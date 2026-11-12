import { describe, expect, it } from 'vitest';
import { calculateUsdMinor, quantityInKilograms } from './contract-math';

describe('contract price calculation', () => {
  it.each([
    ['500 kg', 12, 600000],
    ['2 tonnes', 1.5, 300000],
    ['750 g', 10, 750],
    ['1,000 kg', 2, 200000],
  ])('calculates %s × $%s/kg in cents', (quantity, pricePerKg, expectedCents) => {
    expect(calculateUsdMinor(quantity, pricePerKg)).toBe(expectedCents);
  });

  it('rejects a quantity that cannot be converted to kilograms', () => {
    expect(quantityInKilograms('a few sacks')).toBeNull();
    expect(calculateUsdMinor('a few sacks', 12)).toBeNull();
  });

  it('rejects zero or invalid prices', () => {
    expect(calculateUsdMinor('500 kg', 0)).toBeNull();
    expect(calculateUsdMinor('500 kg', Number.NaN)).toBeNull();
  });
});
