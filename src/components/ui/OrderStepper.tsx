'use client';

import { t } from '@/lib/i18n/t';
import { cn } from '@/lib/utils';

interface OrderStepperProps {
  currentStep: number;
  steps?: string[];
  className?: string;
}

export default function OrderStepper({ currentStep, steps, className }: OrderStepperProps) {
  const visibleSteps = steps || t('buyer.orderStatus.progressSteps').split(' → ');
  return (
    <nav className={cn('w-full overflow-x-auto', className)} aria-label={t('buyer.orderStatus.progressLabel')}>
      <ol className="flex items-center min-w-max gap-2 sm:gap-4 px-2 py-4" role="list">
        {visibleSteps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isLast = index === visibleSteps.length - 1;

          return (
            <li key={index} className="flex items-center flex-1 sm:flex-none relative" role="listitem">
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                    isCompleted
                      ? 'bg-emerald-600 text-white border-2 border-emerald-600'
                      : isActive
                      ? 'bg-white text-emerald-600 border-3 border-emerald-600 ring-4 ring-emerald-100'
                      : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-center text-xs leading-tight max-w-[80px]',
                    isActive ? 'font-semibold text-emerald-700' : 'text-slate-500'
                  )}
                >
                  {step}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'absolute top-5 left-1/2 w-full h-1 -translate-x-1/2 z-0',
                    isCompleted ? 'bg-emerald-600' : 'bg-slate-200'
                  )}
                  style={{ width: 'calc(100% - 50px)' }}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
