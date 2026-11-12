'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { t, getLang, setLang, SUPPORTED_LANGS } from '@/lib/i18n/t';

export default function TopBar({ role, currentPath }: { role: 'BUYER' | 'SELLER' | 'ARBITER'; currentPath: string }) {
  const [lang, setLangState] = useState<'en' | 'hi' | 'mr'>('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setMounted(true);
    const storedLang = (localStorage.getItem('kavach-lang') as 'en' | 'hi' | 'mr') || 'en';
    setLangState(storedLang);
    setLang(storedLang);
  }, []);

  const handleLangChange = (newLang: 'en' | 'hi' | 'mr') => {
    setLangState(newLang);
    setLang(newLang);
    localStorage.setItem('kavach-lang', newLang);
    document.documentElement.lang = newLang;
    setShowLangMenu(false);
  };

  const toggleAudio = () => {
    if (!('speechSynthesis' in window)) return;
    if (audioPlaying) {
      window.speechSynthesis.cancel();
      setAudioPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(t('app.tagline'));
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-US';
    utterance.onend = () => setAudioPlaying(false);
    utterance.onerror = () => setAudioPlaying(false);
    speech.current = utterance;
    setAudioPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!mounted) {
    return (
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              {role === 'BUYER' ? 'BUYER' : role === 'SELLER' ? 'SELLER' : 'REVIEWER'}
            </span>
          </div>
        </div>
      </header>
    );
  }

  const roleLabels = {
    BUYER: t('topbar.role.buyer'),
    SELLER: t('topbar.role.seller'),
    ARBITER: t('topbar.role.reviewer'),
  };

  const langNames: Record<'en' | 'hi' | 'mr', string> = {
    en: t('lang.en'),
    hi: t('lang.hi'),
    mr: t('lang.mr'),
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            {roleLabels[role]}
          </span>
          {currentPath !== '/dashboard' && (
            <Link href="/dashboard" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
              <span>{t('topbar.backToDashboard')}</span>
            </Link>
          )}
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <LogOut className="h-4 w-4" />
              <span>{t('topbar.signOut')}</span>
            </button>
          </form>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium min-w-[120px] justify-between"
              aria-haspopup="listbox"
              aria-expanded={showLangMenu}
            >
              <span>{langNames[lang]}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50" role="listbox">
                {SUPPORTED_LANGS.map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLangChange(l)}
                    className={`w-full px-3 py-2 text-left text-sm ${lang === l ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                    role="option"
                    aria-selected={lang === l}
                  >
                    {langNames[l]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleAudio}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium min-h-[48px]"
            aria-pressed={audioPlaying}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              {audioPlaying ? (
                <path d="M6 19h4v-3H6v3zm8-3h4v-3h-4v3zm8-3h4v-3h-4v3zM6 7h4V4H6v3zm8 0h4V4h-4v3zm8 0h4V4h-4v3z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              )}
            </svg>
            <span>{audioPlaying ? t('topbar.audioPauseButton') : t('topbar.audioButton')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
