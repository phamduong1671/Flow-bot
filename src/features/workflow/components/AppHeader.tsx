import { Braces, Play, Route } from 'lucide-react';
import { BaseButton } from '../../../components/base/BaseButton';

export function AppHeader({ onRun, onBuildJson }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
          <Route size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight">Flow Bot Builder</h1>
          <p className="text-sm text-slate-500">Drag, connect, and build a bot scenario JSON.</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <BaseButton onClick={onRun} variant="secondary">
          <Play size={18} />
          Run
        </BaseButton>
        <BaseButton onClick={onBuildJson} variant="primary">
          <Braces size={18} />
          Build JSON
        </BaseButton>
      </div>
    </header>
  );
}
