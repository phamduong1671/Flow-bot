import { useEffect, useRef, useState } from 'react';
import {
  Braces,
  LoaderCircle,
  LogIn,
  LogOut,
  Play,
  Plus,
  Route,
  Trash2,
  UserRound,
} from 'lucide-react';
import { BaseButton } from '../../../components/base/BaseButton';
import { useAuth } from '../../auth/AuthContext';
import { useLanguage, type Language } from '../../../i18n';

type AppHeaderProps = {
  onRun: () => void;
  onBuildJson: () => void;
  onOpenAuth: () => void;
  saveStatus: 'local' | 'loading' | 'saving' | 'saved' | 'error';
  flows: Array<{ id: string; name: string }>;
  activeFlowId: string | null;
  flowName: string;
  onFlowNameChange: (value: string) => void;
  onSelectFlow: (id: string) => void;
  onCreateFlow: () => void;
  onDeleteFlow: () => void;
  language: Language;
  onToggleLanguage: () => void;
};

export function AppHeader({
  onRun,
  onBuildJson,
  onOpenAuth,
  saveStatus,
  flows,
  activeFlowId,
  flowName,
  onFlowNameChange,
  onSelectFlow,
  onCreateFlow,
  onDeleteFlow,
  language,
  onToggleLanguage,
}: AppHeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    const closeUserMenu = (event: MouseEvent) => {
      if (!userMenu.current?.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false);
    };

    document.addEventListener('mousedown', closeUserMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeUserMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [userMenuOpen]);

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
          <Route size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">Flow Bot Builder</h1>
          <p className="text-sm text-slate-500">{t('subtitle')}</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <select
              aria-label={t('selectFlow')}
              className="h-10 max-w-40 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700"
              value={activeFlowId || ''}
              onChange={(event) => onSelectFlow(event.target.value)}
            >
              {flows.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name}
                </option>
              ))}
            </select>
            <input
              aria-label={t('flowName')}
              className="hidden h-10 w-36 rounded-md border border-slate-200 px-3 text-sm text-slate-700 lg:block"
              maxLength={100}
              value={flowName}
              onChange={(event) => onFlowNameChange(event.target.value)}
            />
            <BaseButton onClick={onCreateFlow} size="icon-md" title={t('createFlow')}>
              <Plus size={17} />
            </BaseButton>
            <BaseButton
              onClick={onDeleteFlow}
              size="icon-md"
              title={t('deleteFlow')}
              variant="danger"
            >
              <Trash2 size={16} />
            </BaseButton>
          </div>
        )}
        <div
          aria-live="polite"
          className={`flex min-w-28 items-center justify-end gap-1.5 text-xs ${saveStatus === 'error' ? 'text-rose-600' : 'text-slate-400'}`}
          role="status"
        >
          {(saveStatus === 'loading' || saveStatus === 'saving') && (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={14} />
          )}
          <span>{t(saveStatus)}</span>
        </div>
        <BaseButton onClick={onRun} variant="secondary">
          <Play size={18} />
          {t('run')}
        </BaseButton>
        <BaseButton onClick={onBuildJson} variant="primary">
          <Braces size={18} />
          {t('buildJson')}
        </BaseButton>
        <BaseButton
          aria-label={t('switchLanguage')}
          onClick={onToggleLanguage}
          size="icon-md"
          title={t('switchLanguage')}
          variant="secondary"
        >
          <span className="text-lg leading-none">{language === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
        </BaseButton>
        {user ? (
          <div className="relative" ref={userMenu}>
            <BaseButton
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((open) => !open)}
              size="icon-md"
              title={t('account')}
              variant="secondary"
            >
              <UserRound size={17} />
            </BaseButton>
            {userMenuOpen && (
              <div
                className="absolute right-0 z-50 mt-2 min-w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                role="menu"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {t('account')}
                  </div>
                  <div className="mt-0.5 max-w-52 truncate text-sm font-semibold text-slate-800">
                    {user.name || user.email}
                  </div>
                  {user.name && (
                    <div className="max-w-52 truncate text-xs text-slate-500">{user.email}</div>
                  )}
                </div>
                <button
                  className="mt-1 flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <LogOut size={16} />
                  {t('signOut')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <BaseButton onClick={onOpenAuth} variant="secondary">
            <LogIn size={17} />
            {t('signIn')}
          </BaseButton>
        )}
      </div>
    </header>
  );
}
