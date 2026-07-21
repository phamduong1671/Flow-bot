import { Activity, AlertTriangle, Bot, Clock3, Coins, Hash, X, Zap } from 'lucide-react';
import { BaseButton } from '../../../components/base/BaseButton';

export function LlmMonitoring({ open, trace, onClose }) {
  if (!open) return null;

  const steps = trace?.steps || [];
  const generations = steps.filter((step) => step.type === 'llm');
  const totalTokens = generations.reduce(
    (total, step) => total + Number(step.telemetry?.totalTokens || 0),
    0,
  );
  const generationCosts = generations.map((step) => step.telemetry?.costUsd);
  const totalCost =
    generationCosts.length > 0 &&
    generationCosts.every((cost) => typeof cost === 'number' && Number.isFinite(cost))
      ? generationCosts.reduce((total, cost) => total + Number(cost), 0)
      : undefined;
  const latencyMs = Number(
    trace?.latencyMs || steps.reduce((total, step) => total + Number(step.latencyMs || 0), 0),
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <section
        className="mx-auto flex h-[min(760px,calc(100vh-32px))] max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_32px_100px_rgba(15,23,42,0.4)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
              <Activity size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">LLM monitoring</h2>
                <StatusBadge status={trace?.status || 'idle'} />
              </div>
              <p className="truncate text-xs text-slate-500">
                Trace {trace?.runId || 'has not started yet'}
              </p>
            </div>
          </div>
          <BaseButton variant="secondary" size="icon-sm" onClick={onClose} title="Close monitoring">
            <X size={16} />
          </BaseButton>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {!trace ? (
            <EmptyMonitoring />
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard icon={Clock3} label="Trace latency" value={formatLatency(latencyMs)} />
                <MetricCard icon={Hash} label="Total tokens" value={formatNumber(totalTokens)} />
                <MetricCard icon={Coins} label="Estimated cost" value={formatCost(totalCost)} />
                <MetricCard icon={Zap} label="Observations" value={String(steps.length)} />
              </div>

              {trace.error && <ErrorPanel error={trace.error} />}

              <section className="grid gap-4 lg:grid-cols-2">
                <PayloadCard title="Trace input" value={trace.input} />
                <PayloadCard title="Trace output" value={trace.output} />
              </section>

              <section className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Observation timeline</h3>
                    <p className="text-xs text-slate-500">One observation for each executed node</p>
                  </div>
                  <span className="text-xs text-slate-500">{steps.length} nodes</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {steps.length ? (
                    steps.map((step, index) => (
                      <ObservationRow key={`${step.nodeId}-${index}`} step={step} index={index} />
                    ))
                  ) : (
                    <div className="p-5 text-sm text-slate-500">
                      {trace.status === 'running'
                        ? 'Workflow is running. Metrics will appear when the trace completes.'
                        : 'No node observation was recorded.'}
                    </div>
                  )}
                </div>
              </section>

              {generations.map((step) => (
                <GenerationDetails key={step.nodeId} step={step} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone =
    status === 'completed'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'error'
        ? 'bg-rose-50 text-rose-700 ring-rose-200'
        : status === 'running'
          ? 'bg-amber-50 text-amber-700 ring-amber-200'
          : 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${tone}`}>
      {status}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-slate-400">
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        <Icon size={16} />
      </div>
      <div className="text-xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function PayloadCard({ title, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100">
        {formatPayload(value)}
      </pre>
    </div>
  );
}

function ObservationRow({ step, index }) {
  const telemetry = step.telemetry || {};
  const provider = telemetry.provider || step.output?.provider;
  return (
    <div className="grid gap-3 px-4 py-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center">
      <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
        {index + 1}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{step.label || step.nodeId}</span>
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
            {step.type}
          </span>
        </div>
        <p className="truncate text-xs text-slate-500">
          {telemetry.model || provider || step.nodeId}
        </p>
      </div>
      <div className="flex gap-4 text-right text-xs tabular-nums text-slate-600">
        {telemetry.totalTokens !== undefined && (
          <span>{formatNumber(telemetry.totalTokens)} tokens</span>
        )}
        <span>{formatLatency(step.latencyMs)}</span>
      </div>
    </div>
  );
}

function GenerationDetails({ step }) {
  const telemetry = step.telemetry || {};
  return (
    <section className="rounded-xl border border-indigo-200 bg-white">
      <div className="flex items-center gap-3 border-b border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <Bot size={18} className="text-indigo-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            LLM generation · {step.label || step.nodeId}
          </h3>
          <p className="text-xs text-slate-500">{telemetry.model || 'Default model'}</p>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-4">
        <SmallMetric label="Input" value={`${formatNumber(telemetry.inputTokens || 0)} tokens`} />
        <SmallMetric label="Output" value={`${formatNumber(telemetry.outputTokens || 0)} tokens`} />
        <SmallMetric label="Latency" value={formatLatency(step.latencyMs)} />
        <SmallMetric label="Cost" value={formatCost(telemetry.costUsd)} />
      </div>
      <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
        <PayloadCard title="Prompt" value={telemetry.prompt} />
        <PayloadCard title="Generation output" value={step.output} />
      </div>
    </section>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{value}</div>
    </div>
  );
}

function ErrorPanel({ error }) {
  return (
    <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <div className="text-sm font-semibold">Trace failed at {error.nodeId || 'workflow'}</div>
        <div className="mt-1 text-xs">{error.message}</div>
        {error.code && <div className="mt-1 font-mono text-[11px]">{error.code}</div>}
      </div>
    </div>
  );
}

function EmptyMonitoring() {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <Activity className="mx-auto mb-3 text-slate-300" size={32} />
        <h3 className="text-sm font-semibold text-slate-800">No trace selected</h3>
        <p className="mt-1 text-sm text-slate-500">
          Run the workflow to collect Langfuse trace metrics.
        </p>
      </div>
    </div>
  );
}

function formatLatency(value) {
  const milliseconds = Number(value || 0);
  return milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(2)} s`
    : `${Math.round(milliseconds)} ms`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatCost(value) {
  if (value === undefined || value === null || value === '') return '—';
  const cost = Number(value);
  if (!Number.isFinite(cost)) return '—';
  if (cost > 0 && cost < 0.000001) return `$${cost.toFixed(8)}`;
  return `$${cost.toFixed(6)}`;
}

function formatPayload(value) {
  if (value === undefined || value === null || value === '') return '—';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
