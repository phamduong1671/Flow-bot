import React from 'react';
import { Braces, Play, Route } from 'lucide-react';

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
        <button type="button" onClick={onRun} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          <Play size={18} />
          Run
        </button>
        <button type="button" onClick={onBuildJson} className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
          <Braces size={18} />
          Build JSON
        </button>
      </div>
    </header>
  );
}
