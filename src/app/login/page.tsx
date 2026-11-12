'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { t, setLang, getLang, SUPPORTED_LANGS } from '@/lib/i18n/t';
import { cn } from '@/lib/utils';
import { Shield, Leaf, Eye, EyeOff, Loader2 } from 'lucide-react';
import TopBar from '@/components/ui/TopBar';
import LanguageChooser from '@/components/ui/LanguageChooser';

const demoRoles = [
  { id: 'buyer', email: 'buyer@globalimports.com', label: 'login.demoRoles.buyer', role: 'BUYER' },
  { id: 'sellerHindi', email: 'seller.hindi@kisaankavach.demo', label: 'login.demoRoles.sellerHindi', role: 'SELLER' },
  { id: 'sellerMarathi', email: 'seller.marathi@kisaankavach.demo', label: 'login.demoRoles.sellerMarathi', role: 'SELLER' },
  { id: 'reviewer', email: 'arbiter@kisaankavach.org', label: 'login.demoRoles.reviewer', role: 'ARBITER' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'signin' | 'demo'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));
      localStorage.setItem('kavach-lang', data.language);
      localStorage.setItem('kavach-lang-chosen', 'true');
      setLang(data.language);
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'demo1234' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errors.serverError'));
      localStorage.setItem('kavach-lang', data.language);
      localStorage.setItem('kavach-lang-chosen', 'true');
      setLang(data.language);
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-100 mb-4">
            <Shield className="w-10 h-10 text-emerald-700" />
            <Leaf className="w-8 h-8 text-emerald-600 absolute" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{t('app.name')}</h1>
          <p className="mt-2 text-slate-600">{t('app.tagline')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('signin')}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === 'signin' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t('login.title')}
            </button>
            <button
              onClick={() => setActiveTab('demo')}
              className={cn(
                'flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === 'demo' ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {t('login.demoQuickLogin')}
            </button>
          </div>

          {activeTab === 'signin' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('login.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition min-h-[48px]"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition min-h-[48px] pr-12"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-emerald-600 text-white font-medium text-base min-h-[48px] flex items-center justify-center gap-2 hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t('login.submit')}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {demoRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleDemoLogin(role.email)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-emerald-300 transition text-left min-h-[48px] disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{t(role.label)}</span>
                </button>
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">{t('demo.footer')}</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
