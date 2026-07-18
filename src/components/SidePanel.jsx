import React from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Download, MousePointer2, Trash2 } from 'lucide-react';
import { HEADER_HEIGHT } from '../constants';
import { NodeEditor } from './NodeEditor';

export function SidePanel({
  open,
  onToggle,
  selectedCount,
  selectedNode,
  selectedEdge,
  hasSelection,
  edges,
  nodes,
  selectedEdgeId,
  onDeleteNodes,
  onUpdateNode,
  onSelectEdge,
  onUpdateEdge,
  onRemoveEdge,
  copied,
  onCopyJson,
  onDownloadJson,
  jsonText,
}) {
  return (
    <aside
      className={`absolute right-0 z-20 flex w-[340px] min-h-0 flex-col overflow-visible border-l border-slate-200 bg-white shadow-panel transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ top: HEADER_HEIGHT, height: `calc(100% - ${HEADER_HEIGHT}px)` }}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`absolute -left-5 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md hover:bg-slate-50 ${open ? '' : 'justify-items-start pl-1.5'}`}
        title={open ? 'Collapse panel' : 'Open JSON output'}
      >
        {open ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <div className="min-h-0 flex-1 overflow-auto">
        {selectedCount > 0 && (
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MousePointer2 size={18} />
                Inspector
              </div>
              <button type="button" onClick={onDeleteNodes} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" title="Delete selected nodes">
                <Trash2 size={17} />
              </button>
            </div>

            {selectedNode ? (
              <NodeEditor node={selectedNode} onChange={onUpdateNode} />
            ) : (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {selectedCount} nodes selected
              </div>
            )}
          </div>
        )}

        {hasSelection && (
          <ConnectionList
            edges={edges}
            nodes={nodes}
            selectedEdge={selectedEdge}
            selectedEdgeId={selectedEdgeId}
            onSelectEdge={onSelectEdge}
            onUpdateEdge={onUpdateEdge}
            onRemoveEdge={onRemoveEdge}
          />
        )}

        <div className="flex h-[360px] flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-700">JSON output</div>
            <div className="flex gap-2">
              <button type="button" onClick={onCopyJson} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="Copy JSON">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button type="button" onClick={onDownloadJson} className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title="Download JSON">
                <Download size={16} />
              </button>
            </div>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-emerald-100">
            {jsonText}
          </pre>
        </div>
      </div>
    </aside>
  );
}

function ConnectionList(props) {
  const { edges, nodes, selectedEdge, selectedEdgeId, onSelectEdge, onUpdateEdge, onRemoveEdge } = props;

  return (
    <div className="border-b border-slate-200 p-4">
      <div className="mb-3 text-sm font-semibold text-slate-700">Connections</div>
      {selectedEdge && (
        <div className="mb-3 space-y-2 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-950">
          <div className="font-semibold">Selected connection</div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-indigo-700">Label</span>
            <input value={selectedEdge.label} onChange={(event) => onUpdateEdge('label', event.target.value)} className="h-9 w-full rounded-md border border-indigo-200 bg-white px-2 text-xs text-slate-900 outline-none focus:border-indigo-500" placeholder="next, true, false" />
          </label>
        </div>
      )}

      <div className="max-h-40 space-y-2 overflow-auto pr-1">
        {edges.length === 0 ? (
          <p className="text-sm text-slate-500">No connections.</p>
        ) : (
          edges.map((edge) => <ConnectionItem key={edge.id} edge={edge} nodes={nodes} selected={selectedEdgeId === edge.id} onSelectEdge={onSelectEdge} onRemoveEdge={onRemoveEdge} />)
        )}
      </div>
    </div>
  );
}

function ConnectionItem({ edge, nodes, selected, onSelectEdge, onRemoveEdge }) {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);

  return (
    <div role="button" tabIndex={0} onClick={() => onSelectEdge(edge.id)} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') onSelectEdge(edge.id);
    }} className={`flex items-center justify-between gap-2 rounded-md border px-2 py-2 text-xs ${selected ? 'border-indigo-300 bg-indigo-50 text-indigo-950' : 'border-slate-200'}`}>
      <span className="min-w-0 truncate">
        {source?.label || 'Missing'} <ChevronRight className="inline" size={13} /> {target?.label || 'Missing'}
      </span>
      <button type="button" onClick={(event) => {
        event.stopPropagation();
        onRemoveEdge(edge.id);
      }} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete connection">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
