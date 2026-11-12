export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { getDb } from '@/lib/db/repo';
import { t, getLang } from '@/lib/i18n/t';
import { formatCurrency, formatDate } from '@/lib/utils';
import TopBar from '@/components/ui/TopBar';
import OrderStepper from '@/components/ui/OrderStepper';
import StatusBadge from '@/components/ui/StatusBadge';
import FactsStrip from '@/components/ui/FactsStrip';
import ExplainSimply from '@/components/ui/ExplainSimply';
import PaymentButton from '@/components/ui/PaymentButton';
import { getCurrentAuthorization } from '@/lib/state';
import { confirmDelivery, reportQualityProblem } from './actions';

const statusToStep: Record<string, number> = {
  CREATED: 1,
  AUTHORIZED: 2,
  VERIFY_PENDING: 3,
  AWAITING_APPROVAL: 3,
  LAB_PASSED: 3,
  PARTIALLY_CAPTURED: 4,
  DELIVERED: 5,
  DISPUTED: 4,
  REFUNDED: 4,
  FULLY_CAPTURED: 6,
  REAUTH_NEEDED: 2,
  EXPIRED: 1,
  VOIDED: 1,
};

const statusMessages: Record<string, string> = {
  CREATED: 'simple.paymentReserved.whatHappened',
  AUTHORIZED: 'simple.paymentReserved.whatHappened',
  VERIFY_PENDING: 'simple.checkingReport.whatHappened',
  AWAITING_APPROVAL: 'simple.awaitingApproval.whatHappened',
  LAB_PASSED: 'simple.labReportPassed.whatHappened',
  PARTIALLY_CAPTURED: 'simple.firstPaymentPaid.whatHappened',
  DELIVERED: 'simple.delivered.whatHappened',
  DISPUTED: 'simple.problemReported.whatHappened',
  REFUNDED: 'simple.moneyReturned.whatHappened',
  FULLY_CAPTURED: 'simple.finalPaymentPaid.whatHappened',
  REAUTH_NEEDED: 'simple.renewReservation.whatHappened',
  EXPIRED: 'simple.reservationCancelled.whatHappened',
  VOIDED: 'simple.reservationCancelled.whatHappened',
};

export default async function BuyerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'BUYER') redirect('/login');
  const { id } = await params;
  const orderId = parseInt(id);

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(orderId, session.userId) as any;
  if (!order) notFound();

  const contract = JSON.parse(order.contract_json);
  const totalMinor = order.total_minor;
  const firstPaymentMinor = Math.floor(totalMinor * order.advance_pct / 100);
  const finalPaymentMinor = totalMinor - firstPaymentMinor;
  const authorization = getCurrentAuthorization(orderId);
  const currentStep = statusToStep[order.status] || 1;

  const lang = getLang();

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar role="BUYER" currentPath={`/buyer/orders/${id}`} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.id}</h1>
          <p className="text-slate-600">{contract.product} — {contract.quantity}</p>
        </div>

        <OrderStepper currentStep={currentStep} />

        <div className="mt-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{t('buyer.orderStatus.reservedBanner')}</h2>
              <StatusBadge status={order.status} />
            </div>
            <FactsStrip
              reservedMinor={totalMinor}
              firstPaymentMinor={firstPaymentMinor}
              finalPaymentMinor={finalPaymentMinor}
              reservedUntil={authorization?.expiration_time}
            />
            {authorization && <p className="mt-4 text-sm text-slate-500">{t('buyer.orderStatus.paypalReference')}: <span className="font-mono text-slate-700">{authorization.paypal_authorization_id}</span></p>}
            <ExplainSimply
              stateKey={order.status}
              normalText={t(statusMessages[order.status] || t('status.paymentReserved'))}
              simpleText={{
                whatHappened: t(statusMessages[order.status] || t('simple.paymentReserved.whatHappened')),
                whatItMeans: t(statusMessages[order.status]?.replace('whatHappened', 'whatItMeans') || t('simple.paymentReserved.whatItMeans')),
                whatToDo: t(statusMessages[order.status]?.replace('whatHappened', 'whatToDo') || t('simple.paymentReserved.whatToDo')),
              }}
              factsStrip={<FactsStrip reservedMinor={totalMinor} firstPaymentMinor={firstPaymentMinor} finalPaymentMinor={finalPaymentMinor} reservedUntil={authorization?.expiration_time} />}
            />
          </div>

          {['VERIFY_PENDING', 'AWAITING_APPROVAL', 'LAB_PASSED', 'PARTIALLY_CAPTURED', 'DELIVERED'].includes(order.status) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{t('buyer.orderStatus.labReportCard')}</h2>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-slate-600">Lab report: {order.status === 'AWAITING_APPROVAL' ? t('status.scannedLabReport') : t('status.certifiedLabFile')}</p>
                {order.status === 'AWAITING_APPROVAL' && (
                  <div className="mt-4 flex gap-3">
                    <form action="/api/lab/approve" method="POST">
                      <input type="hidden" name="orderId" value={orderId} />
                      <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium min-h-[48px]">{t('buyer.orderStatus.approve')}</button>
                    </form>
                    <form action="/api/lab/reject" method="POST">
                      <input type="hidden" name="orderId" value={orderId} />
                      <button type="submit" className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium min-h-[48px]">{t('buyer.orderStatus.reject')}</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-3">
            {order.status === 'LAB_PASSED' && <PaymentButton orderId={orderId} stage={1} amount={formatCurrency(firstPaymentMinor)} />}
            {order.status === 'DELIVERED' && <PaymentButton orderId={orderId} stage={2} amount={formatCurrency(finalPaymentMinor)} />}
            {order.status === 'PARTIALLY_CAPTURED' && (
              <form action={confirmDelivery}>
                <input type="hidden" name="orderId" value={orderId} />
                <button type="submit" className="flex-1 px-6 py-3 rounded-lg bg-emerald-600 text-white font-medium min-h-[48px] flex items-center justify-center gap-2 hover:bg-emerald-700 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  {t('buyer.orderStatus.confirmDelivery')}
                </button>
              </form>
            )}
            {['PARTIALLY_CAPTURED', 'DELIVERED'].includes(order.status) && (
              <form action={reportQualityProblem}>
                <input type="hidden" name="orderId" value={orderId} />
                <button type="submit" className="flex-1 px-6 py-3 rounded-lg border-2 border-rose-500 bg-white text-rose-600 font-medium min-h-[48px] flex items-center justify-center gap-2 hover:bg-rose-50 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {t('buyer.orderStatus.reportProblem')}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
