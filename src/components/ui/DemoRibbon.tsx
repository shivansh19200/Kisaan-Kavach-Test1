'use client';

import { t, getLang } from '@/lib/i18n/t';

export default function DemoRibbon() {
  return (
    <div className="w-full bg-amber-600 text-white text-center py-1.5 text-sm font-medium" role="status" aria-live="polite">
      {t('demo.ribbon')}
    </div>
  );
}