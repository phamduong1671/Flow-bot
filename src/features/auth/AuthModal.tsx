import { useEffect, useRef, useState } from 'react';
import { BaseButton } from '../../components/base/BaseButton';
import { BaseInput } from '../../components/base/BaseInput';
import { BaseModal } from '../../components/base/BaseModal';
import { useAuth } from './AuthContext';

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
            setError(reason instanceof Error ? reason.message : 'Đăng nhập Google thất bại.');
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
      });
    };
    if (window.google) return render();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [auth, googleClientId, onClose, open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth[mode](email, password);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
    >
      <form className="space-y-4" onSubmit={submit}>
        <BaseInput
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={setEmail}
        />
        <BaseInput
          label="Mật khẩu"
          type="password"
          minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={setPassword}
        />
        {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <BaseButton className="w-full" type="submit" variant="primary" disabled={loading}>
          {loading ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </BaseButton>
        {googleClientId && (
          <>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              hoặc
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex justify-center" ref={googleButton} />
          </>
        )}
        <p className="text-center text-sm text-slate-600">
          {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button
            className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </p>
      </form>
    </BaseModal>
  );
}
