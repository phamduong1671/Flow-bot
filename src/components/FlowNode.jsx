import React from 'react';
import { NODE_TYPES } from '../constants';

export function FlowNode({
  node,
  selected,
  connecting,
  dragging,
  onPointerDown,
  onSelect,
  onInputClick,
  onOutputClick,
}) {
  const spec = NODE_TYPES[node.type];
  const Icon = spec.icon;

  return (
    <div
      data-flow-node
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      onPointerDown={(event) => {
        if (event.target.closest('[data-port]')) return;
        onPointerDown(node.id, event);
      }}
      className={`absolute w-56 select-none rounded-lg border-2 bg-white shadow-panel will-change-transform transition-[border-color,box-shadow] ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${selected ? 'border-slate-950 ring-2 ring-slate-300' : 'border-slate-200'} ${connecting ? 'ring-4 ring-indigo-200' : ''}`}
      style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
    >
      <button
        type="button"
        data-port="input"
        onClick={(event) => {
          event.stopPropagation();
          onInputClick(node.id);
        }}
        className="absolute -left-3 top-10 h-6 w-6 rounded-full border-2 border-white bg-slate-500 shadow hover:bg-slate-700"
        title="Input port"
      />
      <button
        type="button"
        data-port="output"
        onClick={(event) => {
          event.stopPropagation();
          onOutputClick(node.id);
        }}
        className={`absolute -right-3 top-10 h-6 w-6 rounded-full border-2 border-white shadow ${connecting ? 'bg-indigo-600' : 'bg-slate-500 hover:bg-slate-700'}`}
        title="Output port"
      />
      <div className={`flex items-center gap-2 rounded-t-md border-b px-3 py-2 ${spec.color}`}>
        <span className={`grid h-8 w-8 place-items-center rounded-md text-white ${spec.accent}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{node.label}</div>
          <div className="truncate text-xs opacity-70">{spec.title}</div>
        </div>
      </div>
      <div className="space-y-2 p-3 text-xs text-slate-600">
        {Object.entries(node.data).slice(0, 2).map(([key, value]) => (
          <div key={key} className="rounded-md bg-slate-50 px-2 py-1.5">
            <span className="font-semibold text-slate-500">{key}: </span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
