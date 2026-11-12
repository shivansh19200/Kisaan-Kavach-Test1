'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, LoaderCircle, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { t } from '@/lib/i18n/t';
import { createOrder } from './actions';

type QualityLimit = { name: string; limit: number; unit: string; type: 'max' | 'min' };
type ContractDraft = {
  product: string;
  quantity: string;
  pricePerKg: number;
  totalUsd: number;
  advancePct: number;
  qualityLimits: QualityLimit[];
  labWindowDays: number;
};
type SellerOption = { id: number; email: string; language: 'hi' | 'mr' };

const starterDraft: ContractDraft = {
  product: 'Organic Turmeric',
  quantity: '500 kg',
  pricePerKg: 12,
  totalUsd: 6000,
  advancePct: 30,
  qualityLimits: [
    { name: 'Moisture', limit: 10, unit: '%', type: 'max' },
    { name: 'Curcumin', limit: 3, unit: '%', type: 'min' },
    { name: 'Pesticide Residue', limit: 0.01, unit: 'ppm', type: 'max' },
  ],
  labWindowDays: 14,
};

export default function OrderBuilder({ sellers }: { sellers: SellerOption[] }) {
  const [terms, setTerms] = useState(t('buyer.contract.plainTermsPlaceholder'));
  const [draft, setDraft] = useState(starterDraft);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [sellerId, setSellerId] = useState(String(sellers[0]?.id || ''));
  const totalMinor = Math.round(draft.totalUsd * 100);
  const firstMinor = Math.floor(totalMinor * draft.advancePct / 100);
  const finalMinor = totalMinor - firstMinor;

  const change = (key: keyof ContractDraft, value: string | number) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const draftWithAi = async () => {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plainTerms: terms }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not draft the contract. Please try again.');
      setDraft(result);
      setRecorded(Boolean(result._recorded));
      const notice = result._recorded
        ? `${t('buyer.contract.recordedNotice')} ${t(result._fallbackReason === 'provider_unavailable' ? 'buyer.contract.aiUnavailable' : 'buyer.contract.aiMissingSettings')}`
        : t('buyer.contract.draftReady');
      setNotice(notice);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('buyer.contract.draftError'));
    } finally {
      setBusy(false);
    }
  };

  const confirmContract = async () => {
    setBusy(true);
    setNotice('');
    try {
      const formData = new FormData();
      formData.set('product', draft.product);
      formData.set('sellerId', sellerId);
      formData.set('quantity', draft.quantity);
      formData.set('pricePerKg', String(draft.pricePerKg));
      formData.set('totalUsd', String(draft.totalUsd));
      formData.set('advancePct', String(draft.advancePct));
      formData.set('qualityLimits', JSON.stringify(draft.qualityLimits.map(({ name, limit, unit, type }) => ({ name, [type]: limit, unit }))));
      formData.set('labWindowDays', String(draft.labWindowDays));
      formData.set('deliveryDays', '21');
      formData.set('disputeDays', '7');
      const orderId = await createOrder(formData);
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not reserve the payment. Please try again.');
      window.location.assign(result.approveUrl || `/buyer/orders/${orderId}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t('buyer.contract.createError'));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-950">{t('buyer.contract.title')}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-800"><Sparkles size={20} /></div>
            <div><h2 className="font-semibold text-slate-900">{t('buyer.contract.plainTermsLabel')}</h2><p className="text-sm text-slate-500">{t('buyer.contract.aiProposalNote')}</p></div>
          </div>
          <label htmlFor="plain-terms" className="mb-2 block text-sm font-medium text-slate-700">{t('buyer.contract.plainTermsLabel')}</label>
          <textarea id="plain-terms" value={terms} onChange={(event) => setTerms(event.target.value)} rows={6} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
          <button type="button" onClick={draftWithAi} disabled={busy || !terms.trim()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 font-semibold text-white hover:bg-purple-800 disabled:cursor-wait disabled:opacity-60">
            {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}{busy ? t('common.loading') : t('buyer.contract.draftWithAI')}
          </button>
          {notice && <p role="status" className="mt-3 rounded-lg bg-purple-50 p-3 text-sm text-purple-900">{notice}{recorded && <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Recorded AI Output</span>}</p>}
        </section>

        <section className="rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-slate-900">{t('buyer.contract.previewTitle')}</h2><p className="mt-1 text-sm text-slate-600">{t('buyer.contract.editDraftHint')}</p></div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">{t('buyer.contract.aiReviewBadge')}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('buyer.contract.product')} value={draft.product} onChange={(value) => change('product', value)} />
            <Field label={t('buyer.contract.quantity')} value={draft.quantity} onChange={(value) => change('quantity', value)} />
            <Field label={`${t('buyer.contract.pricePerKg')} (USD)`} type="number" value={draft.pricePerKg} onChange={(value) => change('pricePerKg', Number(value))} />
            <Field label={`${t('buyer.contract.total')} (USD)`} type="number" value={draft.totalUsd} onChange={(value) => change('totalUsd', Number(value))} />
          </div>
          <label htmlFor="seller-for-order" className="mt-4 block text-sm font-medium text-slate-700">
            {t('buyer.contract.sellerForOrder')}
            <select id="seller-for-order" value={sellerId} onChange={(event) => setSellerId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100">
              {sellers.map((seller) => <option key={seller.id} value={seller.id}>{t(seller.language === 'hi' ? 'buyer.contract.hindiSeller' : 'buyer.contract.marathiSeller')} — {seller.email}</option>)}
            </select>
          </label>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Amount label={t('buyer.contract.firstPayment')} value={formatCurrency(firstMinor)} tone="green" />
            <Amount label={t('buyer.contract.finalPayment')} value={formatCurrency(finalMinor)} tone="blue" />
          </div>
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">{t('buyer.contract.qualityLimits')}</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">{t('buyer.contract.limitName')}</th><th className="px-3 py-3">{t('buyer.contract.limitValue')}</th><th className="px-3 py-3">{t('buyer.contract.limitUnit')}</th></tr></thead>
                <tbody>{draft.qualityLimits.map((limit, index) => <tr key={`${limit.name}-${index}`} className="border-t border-slate-100"><td className="px-3 py-3 font-medium text-slate-800">{limit.name}</td><td className="px-3 py-3"><label className="sr-only" htmlFor={`quality-limit-${index}`}>{limit.name} {t('buyer.contract.limitValue')}</label><span className="mr-2">{limit.type === 'max' ? '≤' : '≥'}</span><input id={`quality-limit-${index}`} type="number" step="any" value={limit.limit} onChange={(event) => setDraft((current) => ({ ...current, qualityLimits: current.qualityLimits.map((item, itemIndex) => itemIndex === index ? { ...item, limit: Number(event.target.value) } : item) }))} className="w-24 rounded-lg border border-slate-300 px-2 py-2" /></td><td className="px-3 py-3">{limit.unit}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <button type="button" onClick={confirmContract} disabled={busy || !sellerId || !draft.product.trim() || !draft.quantity.trim() || draft.totalUsd <= 0} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-emerald-800 px-6 py-4 text-center font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"><CheckCircle2 size={20} />{t('buyer.contract.confirmAndReserve')}<ArrowRight size={18} /></button>
        <p className="mt-3 text-center text-sm text-slate-600">{t('buyer.contract.reserveNotePending')}</p>
      </section>
    </>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? 'any' : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>;
}

function Amount({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' }) {
  return <div className={`rounded-xl p-4 ${tone === 'green' ? 'bg-emerald-50 text-emerald-950' : 'bg-blue-50 text-blue-950'}`}><p className="text-sm">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>;
}
