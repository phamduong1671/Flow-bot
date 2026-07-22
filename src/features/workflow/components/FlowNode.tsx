import { BaseCard } from '../../../components/base/BaseCard';
import { BaseButton } from '../../../components/base/BaseButton';
import { NODE_TYPES } from '../../../constants';
import { nodeFieldKeys, useLanguage } from '../../../i18n';

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
  const { t, nodeText } = useLanguage();
  const spec = NODE_TYPES[node.type];
  const text = nodeText(node.type);
  const Icon = spec.icon;
  const hasInputPort = node.type !== 'start';
  const hasOutputPort = node.type !== 'output';

  return (
    <BaseCard
      data-flow-node
      selected={selected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(node.id);
      }}
      onPointerDown={(event) => {
        if ((event.target as Element).closest('[data-port]')) return;
        onPointerDown(node.id, event);
      }}
      className={`pointer-events-auto absolute w-56 select-none will-change-transform ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${connecting ? 'ring-4 ring-indigo-200' : ''}`}
      style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
    >
      {hasInputPort && (
        <BaseButton
          data-port="input"
          onClick={(event) => {
            event.stopPropagation();
            onInputClick(node.id);
          }}
          variant="ghost"
          size="auto"
          className="absolute -left-2.5 top-10 h-5 w-5 rounded-full border-2 border-white bg-slate-500 shadow hover:bg-slate-700"
          title={t('inputPort')}
        />
      )}
      {hasOutputPort && (
        <BaseButton
          data-port="output"
          onClick={(event) => {
            event.stopPropagation();
            onOutputClick(node.id);
          }}
          variant="ghost"
          size="auto"
          className={`absolute -right-2.5 top-10 h-5 w-5 rounded-full border-2 border-white shadow ${connecting ? 'bg-indigo-600' : 'bg-slate-500 hover:bg-slate-700'}`}
          title={t('outputPort')}
        />
      )}
      <div className={`flex items-center gap-2 rounded-t-md border-b px-3 py-2 ${spec.color}`}>
        <span className={`grid h-8 w-8 place-items-center rounded-md text-white ${spec.accent}`}>
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{node.label}</div>
          <div className="truncate text-xs font-medium text-current">{text.title}</div>
        </div>
      </div>
      <div className="space-y-2 p-3 text-xs text-slate-800">
        {Object.entries(node.data)
          .slice(0, 2)
          .map(([key, value]) => (
            <div key={key} className="rounded-md bg-slate-100 px-2 py-1.5">
              <span className="font-bold text-slate-700">
                {nodeFieldKeys[key] ? t(nodeFieldKeys[key]) : key}:{' '}
              </span>
              <span className="font-medium text-slate-900">{String(value)}</span>
            </div>
          ))}
      </div>
    </BaseCard>
  );
}
