'use client';

import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { t, setLang, SUPPORTED_LANGS, getLang } from '@/lib/i18n/t';
import { useRouter, usePathname } from 'next/navigation';

export default function LanguageChooser() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const hasChosen = localStorage.getItem('kavach-lang-chosen');
    if (!hasChosen) {
      setShow(true);
    }
  }, []);

  const handleChoose = (lang: 'en' | 'hi' | 'mr') => {
    setLang(lang);
    localStorage.setItem('kavach-lang', lang);
    localStorage.setItem('kavach-lang-chosen', 'true');
    setShow(false);
    router.refresh();
  };

  const speakLanguage = (lang: 'en' | 'hi' | 'mr') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : 'मराठी');
    utterance.lang = lang === 'en' ? 'en-IN' : lang === 'hi' ? 'hi-IN' : 'mr-IN';
    window.speechSynthesis.speak(utterance);
  };

  if (!mounted || !show) return null;

  const langInfo = {
    en: { name: t('lang.en'), native: 'English' },
    hi: { name: t('lang.hi'), native: 'हिन्दी' },
    mr: { name: t('lang.mr'), native: 'मराठी' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-4" role="dialog" aria-modal="true" aria-labelledby="lang-title">
      <div className="w-full max-w-md text-center">
        <h1 id="lang-title" className="text-3xl font-bold text-emerald-700 mb-2">
          {t('app.name')}
        </h1>
        <p className="text-slate-600 mb-8">{t('login.languageChooserTitle')}</p>
        <div className="grid grid-cols-3 gap-4">
          {SUPPORTED_LANGS.map((lang) => (
            <div key={lang} className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 p-4 hover:border-emerald-400 hover:bg-emerald-50">
              <button type="button" onClick={() => handleChoose(lang)} className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-emerald-700">
                <span className="text-xl font-semibold text-slate-800">{langInfo[lang].native}</span>
                <span className="text-xs text-slate-500">{langInfo[lang].name}</span>
              </button>
              <button type="button" onClick={() => speakLanguage(lang)} aria-label={`Hear ${langInfo[lang].native}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50">
                <Volume2 className="h-4 w-4" /> <span>{langInfo[lang].native}</span>
              </button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-400">{t('demo.footer')}</p>
      </div>
    </div>
  );
}
