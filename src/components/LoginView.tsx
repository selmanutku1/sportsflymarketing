import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Moon, Sun } from 'lucide-react';

interface LoginViewProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onLogin: (passcode: string) => { ok: boolean; error?: string };
}

export function LoginView({ darkMode, onToggleTheme, onLogin }: LoginViewProps) {
  const [passcode, setPasscode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = passcode.trim();
    if (!cleaned) {
      setError('Lütfen geçiş kodunuzu girin.');
      return;
    }
    const result = onLogin(cleaned);
    if (!result.ok) {
      setError(result.error ?? 'Geçiş kodu hatalı. Lütfen tekrar deneyin.');
      return;
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--bg-canvas)] text-[var(--text-primary)] p-4 sm:p-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={darkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
          className="p-2.5 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <main className="w-full max-w-[400px] mx-auto my-auto py-8">
        <div className="p-6 sm:p-8 rounded-[12px] border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/images__1__e22ba1d6.jpg"
              alt="SportsFly"
              className="w-9 h-9 object-contain rounded-[8px] bg-white border border-[var(--border-hairline)] shrink-0"
            />
            <div className="min-w-0 leading-tight">
              <div className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                <span>Sports</span>
                <span className="text-[var(--accent)]">Fly</span>
              </div>
              <div className="text-xs font-medium text-[var(--text-muted)]">
                Sales&amp;Marketing
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
              Ekip Girişi
            </h1>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
              Satış temsilcisi veya yönetici geçiş kodunuzla oturum açın.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-passcode-input"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Geçiş Kodu
              </label>
              <div className="relative">
                <KeyRound
                  className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-passcode-input"
                  type={showCode ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••"
                  className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-[8px] border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-primary)] font-mono-num text-base font-semibold tracking-[0.22em]"
                />
                <button
                  type="button"
                  onClick={() => setShowCode((s) => !s)}
                  aria-label={showCode ? 'Geçiş kodunu gizle' : 'Geçiş kodunu göster'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 px-3 py-2.5 rounded-[8px] border border-[var(--status-error)]/40 bg-[var(--status-error-bg)] text-xs text-[var(--status-error)]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 px-4 rounded-[8px] text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Giriş Yap</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <p className="pt-4 border-t border-[var(--border-hairline)] text-[11px] text-[var(--text-muted)] leading-relaxed">
            Geçiş kodunuzu bilmiyorsanız Süper Admin ile iletişime geçin.
          </p>
        </div>
      </main>

      <footer className="text-center text-[11px] text-[var(--text-muted)]">
        SportsFly Sales&amp;Marketing · Yetkili Satış Ekibi Paneli
      </footer>
    </div>
  );
}
