import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from './api';

type User = { id: string; email: string; name?: string };
type AuthResult = { token: string; user: User };
type AuthContextValue = {
  user: User | null; token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
};

const TOKEN_KEY = 'flow-bot-auth';
const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AuthResult | null {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResult | null>(loadSession);
  async function authenticate(path: string, body: object) {
    const result = await apiRequest(path, { method: 'POST', body: JSON.stringify(body) }) as AuthResult;
    localStorage.setItem(TOKEN_KEY, JSON.stringify(result));
    setSession(result);
  }
  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null, token: session?.token ?? null,
    login: (email, password) => authenticate('/api/auth/login', { email, password }),
    register: (email, password) => authenticate('/api/auth/register', { email, password }),
    loginWithGoogle: (credential) => authenticate('/api/auth/google', { credential }),
    logout: () => { localStorage.removeItem(TOKEN_KEY); setSession(null); },
  }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook và provider được đặt cùng module để giữ API auth nhỏ, tập trung.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
