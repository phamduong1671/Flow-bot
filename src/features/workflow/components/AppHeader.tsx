import { useEffect, useRef, useState } from 'react';
import {
  Braces,
  ChevronDown,
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

const statusText = {
  local: 'Chỉ lưu trên thiết bị',
  loading: 'Đang tải flow…',
  saving: 'Đang lưu…',
  saved: 'Đã lưu',
  error: 'Lỗi lưu flow',
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
}) {
  const { user, logout } = useAuth();
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
          <p className="text-sm text-slate-500">Drag, connect, and build a bot scenario JSON.</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <select
              aria-label="Select flow"
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
              aria-label="Flow name"
              className="hidden h-10 w-36 rounded-md border border-slate-200 px-3 text-sm text-slate-700 lg:block"
              maxLength={100}
              value={flowName}
              onChange={(event) => onFlowNameChange(event.target.value)}
            />
            <BaseButton onClick={onCreateFlow} size="icon-md" title="Create flow">
              <Plus size={17} />
            </BaseButton>
            <BaseButton onClick={onDeleteFlow} size="icon-md" variant="danger" title="Delete flow">
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
          <span>{statusText[saveStatus]}</span>
        </div>
        <BaseButton onClick={onRun} variant="secondary">
          <Play size={18} />
          Run
        </BaseButton>
        <BaseButton onClick={onBuildJson} variant="primary">
          <Braces size={18} />
          Build JSON
        </BaseButton>
        {user ? (
          <div className="relative" ref={userMenu}>
            <BaseButton
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((open) => !open)}
              variant="secondary"
            >
              <UserRound size={17} />
              <span className="max-w-40 truncate">{user.name || user.email}</span>
              <ChevronDown
                className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                size={15}
              />
            </BaseButton>
            {userMenuOpen && (
              <div
                className="absolute right-0 z-50 mt-2 min-w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <BaseButton onClick={onOpenAuth} variant="secondary">
            <LogIn size={17} />
            Đăng nhập
          </BaseButton>
        )}
      </div>
    </header>
  );
}
