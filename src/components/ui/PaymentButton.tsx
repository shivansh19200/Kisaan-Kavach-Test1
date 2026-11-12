'use client';

import { useState } from 'react';
import { CheckCircle2, CircleDollarSign, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n/t';

export default function PaymentButton({ orderId, stage, amount }: { orderId: number; stage: 1 | 2; amount: string }) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const submit = async () => {
    setWorking(true);
    setMessage('');
    try {
      const response = await fetch('/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, stage }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 202) throw new Error(result.error || t('errors.paymentFailed'));
      setMessage(response.status === 202 ? t('payments.confirming') : t('payments.complete'));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('errors.paymentFailed'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={submit} disabled={working} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-center font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60">
        {working ? <LoaderCircle className="animate-spin" size={18} /> : message.includes(t('payments.complete')) ? <CheckCircle2 size={18} /> : <CircleDollarSign size={18} />}
        {working ? t('payments.processing') : t(stage === 1 ? 'payments.firstAction' : 'payments.finalAction', { amount })}
      </button>
      {message && <p className="mt-2 text-center text-sm text-slate-600" role="status">{message}</p>}
    </div>
  );
}
