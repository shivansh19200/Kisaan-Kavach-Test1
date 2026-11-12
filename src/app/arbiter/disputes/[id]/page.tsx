export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { getDb } from '@/lib/db/repo';
import { t } from '@/lib/i18n/t';
import { formatCurrency, formatDate } from '@/lib/utils';
import TopBar from '@/components/ui/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import ExplainSimply from '@/components/ui/ExplainSimply';
import { acceptClaim, rejectClaim } from './actions';

export default async function ArbiterDisputePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'ARBITER') redirect('/login');
  const { id } = await params;
  const orderId = parseInt(id);

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) notFound();

  const contract = JSON.parse(order.contract_json);
  const totalMinor = order.total_minor;
  const firstPaymentMinor = Math.floor(totalMinor * order.advance_pct / 100);
  const finalPaymentMinor = totalMinor - firstPaymentMinor;

  const aiSummary = {
    moisture: { limit: '≤ 10.0%', seller: '8.0% ✓', buyer: '12.5% ✗' },
    curcumin: { limit: '≥ 3.0%', seller: '3.5% ✓', buyer: '2.8% ✗' },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar role="ARBITER" currentPath={`/arbiter/disputes/${id}`} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{t('arbiter.disputes.title')}</h1>
          <p className="text-slate-600">Order #{order.id} — {contract.product}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div>
              <p className="text-xs text-slate-500">{t('arbiter.disputes.orderNumber')}</p>
              <p className="font-medium">#{order.id}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t('arbiter.disputes.dateReported')}</p>
              <p className="font-medium">{formatDate(order.updated_at)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t('arbiter.disputes.deadline')}</p>
              <p className="font-medium text-rose-600">{formatDate(order.dispute_deadline)}</p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            {t('arbiter.disputes.aiSummary')}
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">AI</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">Parameter</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">{t('arbiter.disputes.contractLimit')}</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">{t('arbiter.disputes.sellerResult')}</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">{t('arbiter.disputes.buyerResult')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2">Moisture</td>
                  <td className="px-3 py-2">{aiSummary.moisture.limit}</td>
                  <td className="px-3 py-2 text-emerald-700">{aiSummary.moisture.seller}</td>
                  <td className="px-3 py-2 text-rose-700">{aiSummary.moisture.buyer}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Curcumin</td>
                  <td className="px-3 py-2">{aiSummary.curcumin.limit}</td>
                  <td className="px-3 py-2 text-emerald-700">{aiSummary.curcumin.seller}</td>
                  <td className="px-3 py-2 text-rose-700">{aiSummary.curcumin.buyer}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ExplainSimply
            stateKey="DISPUTED"
            normalText="AI analysis shows the buyer's independent lab report indicates moisture at 12.5% (limit 10%) and curcumin at 2.8% (limit 3%), both outside contract limits. The seller's report shows values within limits."
            simpleText={{
              whatHappened: "The buyer says the goods don't match what was promised. A fair person will look at papers and photos from both of you.",
              whatItMeans: "The buyer's lab report shows problems. The seller's report looks fine. You need to decide who is right.",
              whatToDo: "Look at both reports and photos below, then choose a button.",
            }}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">{t('arbiter.disputes.sellerFile')}</h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">Seller's certified lab file (PDF)</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">{t('arbiter.disputes.buyerFile')}</h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-600">Buyer's independent lab file (PDF)</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            {t('arbiter.disputes.photos')}
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">{t('arbiter.disputes.aiNotes')}</span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">Seal photo</div>
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">Sample source</div>
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">Goods photo</div>
          </div>
          <p className="mt-3 text-sm text-purple-700 bg-purple-50 p-3 rounded-lg">AI notes: Seal appears intact. Sample packaging visible. (Advice only)</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <form action={acceptClaim}>
            <input type="hidden" name="orderId" value={orderId} />
            <button type="submit" className="w-full px-6 py-4 rounded-lg bg-rose-600 text-white font-semibold text-base min-h-[56px] flex items-center justify-center gap-3 hover:bg-rose-700 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {t('arbiter.disputes.acceptClaim', { amount: formatCurrency(firstPaymentMinor), rest: formatCurrency(finalPaymentMinor) })}
            </button>
          </form>
          <form action={rejectClaim}>
            <input type="hidden" name="orderId" value={orderId} />
            <button type="submit" className="w-full px-6 py-4 rounded-lg bg-emerald-600 text-white font-semibold text-base min-h-[56px] flex items-center justify-center gap-3 hover:bg-emerald-700 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              {t('arbiter.disputes.rejectClaim', { amount: formatCurrency(finalPaymentMinor) })}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}