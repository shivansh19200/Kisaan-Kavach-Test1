export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db/repo';
import Link from 'next/link';
import { t } from '@/lib/i18n/t';
import { getServerLang } from '@/lib/i18n/server';
import { getUsdInrReferenceRate } from '@/lib/fx';
import CurrencyEstimate from '@/components/ui/CurrencyEstimate';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Shield, Package, Gavel, Plus, Eye } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import StatusBadge from '@/components/ui/StatusBadge';

const roleConfig = {
  BUYER: { label: 'topbar.role.buyer', icon: Shield },
  SELLER: { label: 'topbar.role.seller', icon: Package },
  ARBITER: { label: 'topbar.role.reviewer', icon: Gavel },
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const config = roleConfig[session.role];
  const db = getDb();

  let orders: any[] = [];
  if (session.role === 'BUYER') {
    orders = db.prepare(`
      SELECT orders.*, sellers.email AS seller_email, sellers.language AS seller_language
      FROM orders
      JOIN users AS sellers ON sellers.id = orders.seller_id
      WHERE orders.buyer_id = ?
      ORDER BY orders.created_at DESC
    `).all(session.userId) as any[];
  } else if (session.role === 'SELLER') {
    orders = db.prepare('SELECT * FROM orders WHERE seller_id = ? ORDER BY created_at DESC').all(session.userId) as any[];
  } else if (session.role === 'ARBITER') {
    orders = db.prepare("SELECT * FROM orders WHERE status = 'DISPUTED' ORDER BY updated_at DESC").all() as any[];
  }

  const [lang, exchangeRate] = await Promise.all([
    getServerLang(session.language),
    getUsdInrReferenceRate(),
  ]);
  const roleSubtitle = session.role === 'BUYER'
    ? 'dashboard.yourOrders'
    : session.role === 'SELLER'
      ? 'dashboard.assignedOrders'
      : 'dashboard.disputesToReview';
  const emptyDescription = session.role === 'BUYER'
    ? 'dashboard.emptyBuyer'
    : session.role === 'SELLER'
      ? 'dashboard.emptySeller'
      : 'dashboard.emptyReviewer';

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar role={session.role} currentPath="/dashboard" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('app.name', undefined, lang)} — {t(config.label, undefined, lang)}</h1>
            <p className="mt-1 text-slate-600">{t(roleSubtitle, undefined, lang)}</p>
            {session.role !== 'ARBITER' && <p className="mt-2 max-w-3xl text-xs text-slate-500">{t('currency.paypalNote', undefined, lang)}</p>}
          </div>
          {session.role === 'BUYER' && (
            <Link
              href="/buyer/orders/new"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium min-h-[48px] hover:bg-emerald-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span>{t('buyer.contract.title', undefined, lang)}</span>
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <config.icon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('dashboard.noOrders', undefined, lang)}</h2>
            <p className="text-slate-500">{t(emptyDescription, undefined, lang)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const contract = JSON.parse(order.contract_json);
              const totalMinor = order.total_minor;
              const advancePct = order.advance_pct || 30;
              const firstPaymentMinor = Math.floor(totalMinor * advancePct / 100);
              const finalPaymentMinor = totalMinor - firstPaymentMinor;

              return (
                <Link
                  key={order.id}
                  href={session.role === 'ARBITER' ? `/arbiter/disputes/${order.id}` : session.role === 'BUYER' ? `/buyer/orders/${order.id}` : `/seller/orders/${order.id}`}
                  className="block bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 truncate">{t('dashboard.orderTitle', { id: order.id, product: contract.product }, lang)}</h3>
                        <StatusBadge status={order.status} language={lang} />
                      </div>
                      <p className="text-sm text-slate-600">{t('dashboard.priceLine', { quantity: contract.quantity, price: formatCurrency(Math.round(contract.price_per_kg_usd * 100), 'USD', lang), total: formatCurrency(totalMinor, 'USD', lang) }, lang)}</p>
                      {session.role === 'BUYER' && <p className="mt-1 text-sm text-slate-600">{t('buyer.contract.sellerForOrder', undefined, lang)}: {t(order.seller_language === 'mr' ? 'buyer.contract.marathiSeller' : 'buyer.contract.hindiSeller', undefined, lang)} ({order.seller_email})</p>}
                      {session.role !== 'ARBITER' && <CurrencyEstimate amountMinor={totalMinor} reference={exchangeRate} language={lang} />}
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span>{t('dashboard.created', { date: formatDate(order.created_at, lang) }, lang)}</span>
                        {order.lab_deadline && <span>{t('dashboard.labDeadline', { date: formatDate(order.lab_deadline, lang) }, lang)}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900">{formatCurrency(firstPaymentMinor, 'USD', lang)}</p>
                        <p className="text-xs text-slate-500">{t('dashboard.firstPayment', { percent: advancePct }, lang)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900">{formatCurrency(finalPaymentMinor, 'USD', lang)}</p>
                        <p className="text-xs text-slate-500">{t('dashboard.finalPayment', { percent: 100 - advancePct }, lang)}</p>
                      </div>
                      <Eye className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
