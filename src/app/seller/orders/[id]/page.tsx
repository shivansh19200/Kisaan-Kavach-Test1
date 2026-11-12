export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { getDb } from '@/lib/db/repo';
import { t } from '@/lib/i18n/t';
import { getServerLang } from '@/lib/i18n/server';
import { getUsdInrReferenceRate } from '@/lib/fx';
import { formatCurrency, formatDate } from '@/lib/utils';
import TopBar from '@/components/ui/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';
import FactsStrip from '@/components/ui/FactsStrip';
import ExplainSimply from '@/components/ui/ExplainSimply';
import UploadDropzone from '@/components/ui/UploadDropzone';
import CurrencyEstimate from '@/components/ui/CurrencyEstimate';

const sellerStatusMessages: Record<string, { normal: string; simple: { whatHappened: string; whatItMeans: string; whatToDo: string } }> = {
  CREATED: {
    normal: 'status.paymentNotReserved',
    simple: { whatHappened: 'simple.paymentNotReserved.whatHappened', whatItMeans: 'simple.paymentNotReserved.whatItMeans', whatToDo: 'simple.paymentNotReserved.whatToDo' },
  },
  AUTHORIZED: {
    normal: 'status.paymentReserved',
    simple: { whatHappened: 'simple.paymentReserved.whatHappened', whatItMeans: 'simple.paymentReserved.whatItMeans', whatToDo: 'simple.paymentReserved.whatToDo' },
  },
  VERIFY_PENDING: {
    normal: 'status.checkingReport',
    simple: { whatHappened: 'simple.checkingReport.whatHappened', whatItMeans: 'simple.checkingReport.whatItMeans', whatToDo: 'simple.checkingReport.whatToDo' },
  },
  AWAITING_APPROVAL: {
    normal: 'status.awaitingApproval',
    simple: { whatHappened: 'simple.awaitingApproval.whatHappened', whatItMeans: 'simple.awaitingApproval.whatItMeans', whatToDo: 'simple.awaitingApproval.whatToDo' },
  },
  LAB_PASSED: {
    normal: 'status.labReportPassed',
    simple: { whatHappened: 'simple.labReportPassed.whatHappened', whatItMeans: 'simple.labReportPassed.whatItMeans', whatToDo: 'simple.labReportPassed.whatToDo' },
  },
  PARTIALLY_CAPTURED: {
    normal: 'status.firstPaymentPaid',
    simple: { whatHappened: 'simple.firstPaymentPaid.whatHappened', whatItMeans: 'simple.firstPaymentPaid.whatItMeans', whatToDo: 'simple.firstPaymentPaid.whatToDo' },
  },
  DELIVERED: {
    normal: 'status.delivered',
    simple: { whatHappened: 'simple.delivered.whatHappened', whatItMeans: 'simple.delivered.whatItMeans', whatToDo: 'simple.delivered.whatToDo' },
  },
  DISPUTED: {
    normal: 'status.problemReported',
    simple: { whatHappened: 'simple.problemReported.whatHappened', whatItMeans: 'simple.problemReported.whatItMeans', whatToDo: 'simple.problemReported.whatToDo' },
  },
  REFUNDED: {
    normal: 'status.moneyReturned',
    simple: { whatHappened: 'simple.moneyReturned.whatHappened', whatItMeans: 'simple.moneyReturned.whatItMeans', whatToDo: 'simple.moneyReturned.whatToDo' },
  },
  FULLY_CAPTURED: {
    normal: 'status.finalPaymentPaid',
    simple: { whatHappened: 'simple.finalPaymentPaid.whatHappened', whatItMeans: 'simple.finalPaymentPaid.whatItMeans', whatToDo: 'simple.finalPaymentPaid.whatToDo' },
  },
  REAUTH_NEEDED: {
    normal: 'status.renewReservation',
    simple: { whatHappened: 'simple.renewReservation.whatHappened', whatItMeans: 'simple.renewReservation.whatItMeans', whatToDo: 'simple.renewReservation.whatToDo' },
  },
  EXPIRED: {
    normal: 'status.reservationCancelled',
    simple: { whatHappened: 'simple.reservationCancelled.whatHappened', whatItMeans: 'simple.reservationCancelled.whatItMeans', whatToDo: 'simple.reservationCancelled.whatToDo' },
  },
  VOIDED: {
    normal: 'status.reservationCancelled',
    simple: { whatHappened: 'simple.reservationCancelled.whatHappened', whatItMeans: 'simple.reservationCancelled.whatItMeans', whatToDo: 'simple.reservationCancelled.whatToDo' },
  },
};

export default async function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'SELLER') redirect('/login');
  const { id } = await params;
  const orderId = parseInt(id);

  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND seller_id = ?').get(orderId, session.userId) as any;
  if (!order) notFound();

  const contract = JSON.parse(order.contract_json);
  const totalMinor = order.total_minor;
  const firstPaymentMinor = Math.floor(totalMinor * order.advance_pct / 100);
  const finalPaymentMinor = totalMinor - firstPaymentMinor;

  const [lang, exchangeRate] = await Promise.all([
    getServerLang(session.language),
    getUsdInrReferenceRate(),
  ]);
  const msg = sellerStatusMessages[order.status] || sellerStatusMessages.CREATED;
  const pageText = (key: string, params?: Record<string, string | number>) => t(key, params, lang);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar role="SELLER" currentPath={`/seller/orders/${id}`} />
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">{pageText('dashboard.orderNumber', { id: order.id })}</h1>
          <p className="text-slate-600">{contract.product} — {contract.quantity}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">{pageText('seller.orderStatus.messageCard')}</h2>
            <StatusBadge status={order.status} language={lang} />
          </div>
          <ExplainSimply
            stateKey={order.status}
            audioKey={msg.normal.replace('status.', '')}
            normalText={pageText(msg.normal)}
            simpleText={{
              whatHappened: pageText(msg.simple.whatHappened),
              whatItMeans: pageText(msg.simple.whatItMeans),
              whatToDo: pageText(msg.simple.whatToDo),
            }}
            factsStrip={
              <FactsStrip
                firstPaymentMinor={firstPaymentMinor}
                finalPaymentMinor={finalPaymentMinor}
                reservedUntil={order.status === 'CREATED' ? undefined : order.lab_deadline || undefined}
              />
            }
          />
          <CurrencyEstimate amountMinor={totalMinor} reference={exchangeRate} language={lang} />
        </div>

        {['AUTHORIZED', 'VERIFY_PENDING', 'AWAITING_APPROVAL'].includes(order.status) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <h2 className="text-base font-semibold text-slate-900 mb-3">{pageText('seller.orderStatus.uploadLabReport')}</h2>
            <UploadDropzone
              orderId={orderId}
              uploadPath="/api/lab/upload"
              accept=".pdf,.png,.jpg,.jpeg"
              maxSizeMB={5}
              label={pageText('seller.orderStatus.uploadLabReport')}
              description={pageText('seller.orderStatus.dragDropOrClick')}
            />
          </div>
        )}

        {['PARTIALLY_CAPTURED', 'DELIVERED', 'DISPUTED'].includes(order.status) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <h2 className="text-base font-semibold text-slate-900 mb-3">{pageText('seller.orderStatus.uploadShipping')}</h2>
            <UploadDropzone
              orderId={orderId}
              uploadPath="/api/shipping/upload"
              accept=".pdf,.png,.jpg,.jpeg"
              maxSizeMB={3}
              label={pageText('seller.orderStatus.uploadShipping')}
              description={pageText('seller.orderStatus.dragDropOrClick')}
            />
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h2 className="text-base font-semibold text-slate-900 mb-3">{pageText('seller.orderStatus.paymentsList')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">{pageText('seller.orderStatus.paymentDate')}</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">{pageText('seller.orderStatus.paymentType')}</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">{pageText('seller.orderStatus.paymentAmount')}</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium">{pageText('seller.orderStatus.paymentStatus')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2">{formatDate(order.created_at, lang)}</td>
                  <td className="px-3 py-2">{pageText('dashboard.firstPayment', { percent: order.advance_pct || 30 })}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{formatCurrency(firstPaymentMinor, 'USD', lang)}</td>
                  <td className="px-3 py-2">
                    {['PARTIALLY_CAPTURED', 'DELIVERED', 'DISPUTED', 'REFUNDED', 'FULLY_CAPTURED'].includes(order.status) ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">{pageText('seller.orderStatus.paid')}</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">{pageText('seller.orderStatus.pending')}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2">—</td>
                  <td className="px-3 py-2">{pageText('dashboard.finalPayment', { percent: 100 - (order.advance_pct || 30) })}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{formatCurrency(finalPaymentMinor, 'USD', lang)}</td>
                  <td className="px-3 py-2">
                    {order.status === 'FULLY_CAPTURED' ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">{pageText('seller.orderStatus.paid')}</span>
                    ) : order.status === 'REFUNDED' ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700">{pageText('status.reservationCancelled')}</span>
                    ) : order.status === 'CREATED' ? (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{pageText('status.paymentNotReserved')}</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{pageText('status.paymentReserved')}</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">{pageText('seller.orderStatus.demoBanner')}</p>
        </div>
      </main>
    </div>
  );
}
