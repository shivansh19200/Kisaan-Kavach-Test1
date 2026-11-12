/** Parse the seller's weight into kilograms. A number without a unit means kg. */
export function quantityInKilograms(quantity: string): number | null {
  const match = quantity.trim().match(/^(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)\s*(kg|kilograms?|g|grams?|tonnes?|tons?)?$/i);
  if (!match) return null;

  const amount = Number(match[1].includes(',') && /,\d{3}/.test(match[1]) ? match[1].replace(/,/g, '') : match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const unit = (match[2] || 'kg').toLowerCase();
  if (unit === 'g' || unit.startsWith('gram')) return amount / 1000;
  if (unit.startsWith('ton')) return amount * 1000;
  return amount;
}

/** Calculate an order total in integer USD cents to avoid floating point money. */
export function calculateUsdMinor(quantity: string, pricePerKg: number): number | null {
  const kilograms = quantityInKilograms(quantity);
  if (!kilograms || !Number.isFinite(pricePerKg) || pricePerKg <= 0) return null;

  const cents = Math.round(kilograms * pricePerKg * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}
