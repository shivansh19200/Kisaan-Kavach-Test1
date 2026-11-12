import { t, type SupportedLang } from '@/lib/i18n/t';
import type { USDINRReferenceRate } from '@/lib/fx';

export default function CurrencyEstimate({
  amountMinor,
  reference,
  language,
}: {
  amountMinor: number;
  reference: USDINRReferenceRate | null;
  language: SupportedLang;
}) {
  if (!reference) return <p className="mt-1 text-xs text-slate-500">{t('currency.rateUnavailable', undefined, language)}</p>;

  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
  const amountInr = (amountMinor / 100) * reference.rate;
  const formattedAmount = new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amountInr);
  const formattedRate = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(reference.rate);

  return (
    <p className="mt-1 text-xs text-slate-500">
      {t('currency.inrEstimate', { amount: formattedAmount, rate: formattedRate, date: reference.date }, language)}
    </p>
  );
}
