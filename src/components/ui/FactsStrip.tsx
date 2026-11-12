'use client';

import { t, getLang } from '@/lib/i18n/t';
import { formatCurrency, formatDate } from '@/lib/utils';

interface FactsStripProps {
  reservedMinor?: number;
  firstPaymentMinor?: number;
  finalPaymentMinor?: number;
  reservedUntil?: string;
  className?: string;
}

export default function FactsStrip({ reservedMinor, firstPaymentMinor, finalPaymentMinor, reservedUntil, className }: FactsStripProps) {
  const lang = getLang();
  const items: Array<{ label: string; value: string }> = [];

  if (reservedMinor !== undefined) {
    items.push({ label: t('factsStrip.reserved'), value: formatCurrency(reservedMinor) });
  }
  if (firstPaymentMinor !== undefined) {
    items.push({ label: t('factsStrip.firstPaymentReady'), value: formatCurrency(firstPaymentMinor) });
  }
  if (finalPaymentMinor !== undefined) {
    items.push({ label: t('factsStrip.finalPaymentReady'), value: formatCurrency(finalPaymentMinor) });
  }
  if (reservedUntil) {
    items.push({ label: `${t('factsStrip.until')} ${formatDate(reservedUntil, lang)}`, value: '' });
  }

  if (items.length === 0) return null;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-slate-50 rounded-xl border border-slate-200', className)} role="list" aria-label="Key facts">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1" role="listitem">
          <span className="text-xs text-slate-500 uppercase tracking-wide">{item.label}</span>
          <span className="text-lg font-semibold text-slate-900 tabular-nums">{item.value || item.label}</span>
        </div>
      ))}
    </div>
  );
}

import { cn } from '@/lib/utils';