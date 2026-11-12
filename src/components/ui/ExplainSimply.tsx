'use client';

import { useState, useEffect } from 'react';
import { t, getLang } from '@/lib/i18n/t';
import { cn } from '@/lib/utils';
import { Sparkles, Wand2, X } from 'lucide-react';

interface ExplainSimplyProps {
  stateKey: string;
  audioKey?: string;
  normalText: string;
  simpleText: {
    whatHappened: string;
    whatItMeans: string;
    whatToDo: string;
  };
  factsStrip?: React.ReactNode;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export default function ExplainSimply({ stateKey, audioKey, normalText, simpleText, factsStrip, onAction, actionLabel, className }: ExplainSimplyProps) {
  const [simple, setSimple] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lang = getLang();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const toggleSimple = () => {
    setSimple(!simple);
  };

  const content = simple ? (
    <div className="space-y-4" role="region" aria-label={t('wand.simpleViewChip')}>
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-2xl" aria-hidden="true">✨</span>
          <p className="text-slate-800 text-base leading-relaxed">{simpleText.whatHappened}</p>
        </div>
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-2xl" aria-hidden="true">💡</span>
          <p className="text-slate-800 text-base leading-relaxed">{simpleText.whatItMeans}</p>
        </div>
        <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-2xl" aria-hidden="true">▶️</span>
          <p className="text-slate-800 text-base leading-relaxed">{simpleText.whatToDo}</p>
        </div>
      </div>
      {factsStrip && <div className="pt-2 border-t border-slate-200">{factsStrip}</div>}
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="w-full mt-4 px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium text-base min-h-[48px] flex items-center justify-center gap-2"
        >
          <span>{actionLabel}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4-4 4m-6-8l4 4-4 4" /></svg>
        </button>
      )}
      <button
        onClick={toggleSimple}
        className="w-full mt-3 px-4 py-2 text-sm text-slate-600 hover:text-slate-800 flex items-center justify-center gap-2"
      >
        <X className="w-4 h-4" />
        <span>{t('wand.showExactDetails')}</span>
      </button>
    </div>
  ) : (
    <p className="text-slate-700 text-base leading-relaxed">{normalText}</p>
  );

  return (
    <div className={cn('relative p-4 rounded-xl border transition-all duration-300', simple ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 bg-white', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {content}
        </div>
        <button
          onClick={toggleSimple}
          className={cn(
            'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-h-[48px]',
            simple
              ? 'bg-amber-100 border-amber-300 text-amber-800'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-300'
          )}
          aria-pressed={simple}
          aria-label={simple ? t('wand.showExactDetails') : t('wand.label')}
        >
          <Wand2 className={cn('w-5 h-5 transition-transform duration-300', simple && !reducedMotion && 'rotate-12')} />
          <span className="text-sm font-medium">{simple ? t('wand.simpleViewChip') : t('wand.label')}</span>
          {!simple && !reducedMotion && <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />}
        </button>
      </div>
      {audioKey && <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="mb-2 text-xs font-medium text-slate-500">{t('audio.preRecorded')}</p>
        <audio key={`${lang}-${audioKey}-${simple}`} controls preload="none" className="w-full" src={`/audio/${lang}/${simple ? 'simple' : 'normal'}/${audioKey}${simple ? '_whatHappened' : ''}.mp3`}>
          {t('audio.unavailable')}
        </audio>
      </div>}
    </div>
  );
}
