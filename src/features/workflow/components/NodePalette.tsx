import { ChevronLeft, ChevronRight, Hand, Plus, WandSparkles } from 'lucide-react';
import { BaseButton } from '../../../components/base/BaseButton';
import { HEADER_HEIGHT, NODE_TYPES } from '../../../constants';

export function NodePalette({ open, onToggle, onDragStart, showSampleAction, onUseSampleFlow }) {
  return (
    <aside
      className={`absolute left-0 z-20 flex min-h-0 w-[260px] flex-col overflow-visible border-r border-slate-200 bg-white shadow-panel transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
      style={{ top: HEADER_HEIGHT, height: `calc(100% - ${HEADER_HEIGHT}px)` }}
    >
      <BaseButton
        onClick={onToggle}
        variant="secondary"
        size="icon-md"
        className={`absolute -right-5 top-3 z-20 rounded-full text-slate-700 shadow-md ${open ? '' : 'justify-items-end pr-1.5'}`}
        title={open ? 'Collapse Node palette' : 'Open Node palette'}
      >
        {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </BaseButton>
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Plus size={18} className="shrink-0" />
          <span>Node palette</span>
        </div>
        {showSampleAction && (
          <BaseButton
            onClick={onUseSampleFlow}
            variant="secondary"
            size="sm"
            className="h-8 shrink-0 px-2"
            title="Use sample flow"
          >
            <WandSparkles size={14} />
            Use sample
          </BaseButton>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {Object.entries(NODE_TYPES).map(([type, spec]) => {
            const Icon = spec.icon;
            return (
              <BaseButton
                key={type}
                variant="plain"
                size="auto"
                draggable
                onDragStart={(event) => onDragStart(event, type)}
                className={`flex w-full cursor-grab items-start gap-3 rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${spec.color}`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-md text-white ${spec.accent}`}
                >
                  <Icon size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{spec.title}</span>
                  <span className="mt-1 block text-xs opacity-75">{spec.description}</span>
                </span>
              </BaseButton>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
            <Hand size={16} />
            Controls
          </div>
          Drag nodes in. Ctrl + wheel zooms. Right mouse drag pans. Left drag empty space selects
          nodes.
        </div>
      </div>
    </aside>
  );
}
