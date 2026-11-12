import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('contract draft continuity fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('LLM_BASE_URL', '');
    vi.stubEnv('LLM_API_KEY', '');
    vi.stubEnv('LLM_MODEL', '');
  });

  it('builds a reviewable draft from the buyer terms when the provider is not configured', async () => {
    const { draftContract } = await import('./ai');
    const draft = await draftContract('500 kg organic turmeric at $12/kg, moisture max 10%, curcumin min 3%, lab check within 14 days');

    expect(draft).toMatchObject({
      _assisted: true,
      _fallbackReason: 'missing_settings',
      product: 'organic turmeric',
      quantity: '500 kg',
      pricePerKg: 12,
      advancePct: 30,
      labWindowDays: 14,
    });
    expect('qualityLimits' in draft && draft.qualityLimits).toEqual([
      { name: 'Moisture', type: 'max', limit: 10, unit: '%' },
      { name: 'Curcumin', type: 'min', limit: 3, unit: '%' },
    ]);
  });
});
