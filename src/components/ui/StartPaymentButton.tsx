'use client';

import { useState } from 'react';
import { LoaderCircle, WalletCards } from 'lucide-react';
import { t, type SupportedLang } from '@/lib/i18n/t';

export default function StartPaymentButton({ orderId, language }: { orderId: number; language: SupportedLang }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const startCheckout = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();
      if (!response.ok || !result.approveUrl) throw new Error(result.error || t('buyer.orderStatus.paymentStartError', undefined, language));
      window.location.assign(result.approveUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('buyer.orderStatus.paymentStartError', undefined, language));
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <button type="button" onClick={startCheckout} disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">
        {busy ? <LoaderCircle className="animate-spin" size={18} /> : <WalletCards size={18} />}
        {busy ? t('payments.processing', undefined, language) : t('buyer.orderStatus.retryPayment', undefined, language)}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
    </div>
  );
}
