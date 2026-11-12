import { t } from '@/lib/i18n/t';
import type { SupportedLang } from '@/lib/i18n/t';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  simple?: boolean;
  language?: SupportedLang;
}

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string; simpleLabel: string }> = {
  CREATED: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'status.paymentReserved', simpleLabel: 'simple.paymentReserved.whatHappened' },
  AUTHORIZED: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'status.paymentReserved', simpleLabel: 'simple.paymentReserved.whatHappened' },
  VERIFY_PENDING: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'status.checkingReport', simpleLabel: 'simple.checkingReport.whatHappened' },
  AWAITING_APPROVAL: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', label: 'status.awaitingApproval', simpleLabel: 'simple.awaitingApproval.whatHappened' },
  LAB_PASSED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', label: 'status.labReportPassed', simpleLabel: 'simple.labReportPassed.whatHappened' },
  PARTIALLY_CAPTURED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', label: 'status.firstPaymentPaid', simpleLabel: 'simple.firstPaymentPaid.whatHappened' },
  DELIVERED: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', label: 'status.delivered', simpleLabel: 'simple.delivered.whatHappened' },
  DISPUTED: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: 'status.problemReported', simpleLabel: 'simple.problemReported.whatHappened' },
  REFUNDED: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', label: 'status.moneyReturned', simpleLabel: 'simple.moneyReturned.whatHappened' },
  FULLY_CAPTURED: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'status.finalPaymentPaid', simpleLabel: 'simple.finalPaymentPaid.whatHappened' },
  REAUTH_NEEDED: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'status.renewReservation', simpleLabel: 'simple.renewReservation.whatHappened' },
  EXPIRED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'status.reservationCancelled', simpleLabel: 'simple.reservationCancelled.whatHappened' },
  VOIDED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'status.reservationCancelled', simpleLabel: 'simple.reservationCancelled.whatHappened' },
  SHIPPED: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', label: 'status.shipped', simpleLabel: 'simple.shipped.whatHappened' },
  RESERVATION_EXPIRING: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'status.reservationExpiring', simpleLabel: 'simple.reservationExpiring.whatHappened' },
  BUYER_CHECKING_REPORT: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', label: 'status.buyerCheckingReport', simpleLabel: 'simple.buyerCheckingReport.whatHappened' },
  CONFIRMING_WITH_PAYPAL: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'status.confirmingWithPayPal', simpleLabel: 'simple.confirmingWithPayPal.whatHappened' },
  SUSPICIOUS_TEXT_FOUND: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: 'status.suspiciousTextFound', simpleLabel: 'simple.suspiciousTextFound.whatHappened' },
  COULD_NOT_CONFIRM: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', label: 'status.couldNotConfirm', simpleLabel: 'simple.couldNotConfirm.whatHappened' },
};

export default function StatusBadge({ status, className, simple = false, language }: StatusBadgeProps) {
  const config = statusConfig[status] || { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'status.paymentReserved', simpleLabel: 'simple.paymentReserved.whatHappened' };
  const label = simple ? t(config.simpleLabel, undefined, language) : t(config.label, undefined, language);

  return (
    <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border', config.bg, config.text, config.border, className)}>
      {label}
    </span>
  );
}
