import { useEffect, useRef, useState } from 'react';
import { BaseButton } from '../../components/base/BaseButton';
import { BaseInput } from '../../components/base/BaseInput';
import { BaseModal } from '../../components/base/BaseModal';
import { useAuth } from './AuthContext';
import { getLocalizedAuthError, useLanguage } from '../../i18n';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: object) => void;
          renderButton: (element: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language, t } = useLanguage();
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!open || !googleClientId) return;
    const render = () => {
      if (!window.google || !googleButton.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }: { credential: string }) => {
          try {
            setLoading(true);
            setError('');
            await auth.loginWithGoogle(credential);
            onClose();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? getLocalizedAuthError(reason.message, t)
                : t('googleLoginFailed'),
            );
          } finally {
            setLoading(false);
          }
        },
      });
      googleButton.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButton.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        locale: language,
      });
    };
    if (window.google) return render();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [auth, googleClientId, language, onClose, open, t]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth[mode](email, password);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? getLocalizedAuthError(reason.message, t) : t('loginFailed'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={mode === 'login' ? t('login') : t('createAccount')}
    >
      <form className="space-y-4" onSubmit={submit}>
        <BaseInput
          label={t('email')}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <BaseInput
          label={t('password')}
          type="password"
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={setPassword}
        />
        {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <BaseButton className="w-full" type="submit" variant="primary" disabled={loading}>
          {loading ? t('processing') : mode === 'login' ? t('login') : t('register')}
        </BaseButton>
        {googleClientId && (
          <>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              {t('or')}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex justify-center" ref={googleButton} />
          </>
        )}
        <p className="text-center text-sm text-slate-600">
          {mode === 'login' ? t('noAccount') : t('haveAccount')}
          <button
            className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? t('register') : t('login')}
          </button>
        </p>
      </form>
    </BaseModal>
  );
}
