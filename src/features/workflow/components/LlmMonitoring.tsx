import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Braces,
  Bug,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Database,
  EyeOff,
  Hash,
  Info,
  Layers3,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { BaseButton } from '../../../components/base/BaseButton';
import { useLanguage } from '../../../i18n';

type DetailSelection = {
  id: string;
  kind: 'trace' | 'observation' | 'rag' | 'tools' | 'guardrails' | 'errors';
  title: string;
  value: unknown;
};

export function LlmMonitoring({ open, trace, onClose }) {
  const { language, t } = useLanguage();
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const safeTrace = useMemo(() => sanitizeForDisplay(trace), [trace]);
  const view = useMemo(() => buildMonitoringView(safeTrace), [safeTrace]);

  if (!open) return null;

  const closeMonitoring = () => {
    setDetail(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 p-4 backdrop-blur-[2px]"
      onClick={closeMonitoring}
    >
      <section
        aria-label={t('llmMonitoring')}
        className="mx-auto flex h-[min(820px,calc(100vh-32px))] max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_32px_100px_rgba(15,23,42,0.4)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
              <Activity size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{t('llmMonitoring')}</h2>
                <StatusBadge status={view.status} />
              </div>
              <p className="truncate text-xs text-slate-500">
                {t('trace')} {safeTrace?.runId || t('traceNotStarted')}
                {safeTrace?.startedAt ? ` · ${formatDateTime(safeTrace.startedAt, language)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {safeTrace && (
              <BaseButton
                onClick={() =>
                  setDetail({
                    id: 'trace',
                    kind: 'trace',
                    title: t('traceDetails'),
                    value: safeTrace,
                  })
                }
                size="sm"
                variant="secondary"
              >
                <Braces size={14} />
                {t('monitorDetails')}
              </BaseButton>
            )}
            <BaseButton
              variant="secondary"
              size="icon-sm"
              onClick={closeMonitoring}
              title={t('closeMonitoring')}
            >
              <X size={16} />
            </BaseButton>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {!safeTrace ? (
            <EmptyMonitoring />
          ) : (
            <div className="space-y-5">
              <section aria-labelledby="monitor-overview-heading">
                <SectionHeading
                  icon={Activity}
                  id="monitor-overview-heading"
                  title={t('monitorOverview')}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricCard
                    icon={Clock3}
                    label={t('traceLatency')}
                    value={formatLatency(view.latencyMs)}
                  />
                  <MetricCard
                    icon={Hash}
                    label={t('totalTokens')}
                    value={formatNumber(view.totalTokens, language)}
                  />
                  <MetricCard
                    icon={Coins}
                    label={t('estimatedCost')}
                    value={formatCost(view.totalCost)}
                  />
                  <MetricCard
                    icon={Bot}
                    label={t('generations')}
                    value={String(view.generations.length)}
                  />
                  <MetricCard
                    icon={Zap}
                    label={t('observations')}
                    value={String(view.steps.length)}
                  />
                </div>
              </section>

              <TraceSummary
                trace={safeTrace}
                models={view.models}
                onOpen={() =>
                  setDetail({
                    id: 'trace-summary',
                    kind: 'trace',
                    title: t('traceDetails'),
                    value: safeTrace,
                  })
                }
              />

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <CategoryCard
                  icon={Database}
                  title={t('retrievals')}
                  count={view.rag.length}
                  emptyText={t('noRag')}
                  tone="cyan"
                  onClick={() =>
                    setDetail({
                      id: 'rag',
                      kind: 'rag',
                      title: t('retrievals'),
                      value: view.rag,
                    })
                  }
                />
                <CategoryCard
                  icon={Wrench}
                  title={t('toolsActions')}
                  count={view.tools.length}
                  emptyText={t('noTools')}
                  tone="violet"
                  onClick={() =>
                    setDetail({
                      id: 'tools',
                      kind: 'tools',
                      title: t('toolsActions'),
                      value: view.tools,
                    })
                  }
                />
                <CategoryCard
                  icon={ShieldCheck}
                  title={t('guardrails')}
                  count={view.guardrails.length}
                  emptyText={t('noGuardrails')}
                  tone="amber"
                  onClick={() =>
                    setDetail({
                      id: 'guardrails',
                      kind: 'guardrails',
                      title: t('guardrails'),
                      value: view.guardrails,
                    })
                  }
                />
                <CategoryCard
                  icon={Bug}
                  title={t('errors')}
                  count={view.errors.length}
                  emptyText={t('noErrors')}
                  tone="rose"
                  onClick={() =>
                    setDetail({
                      id: 'errors',
                      kind: 'errors',
                      title: t('errors'),
                      value: view.errors,
                    })
                  }
                />
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t('observationTimeline')}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">{t('timelineHint')}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {t('nodeCount', { count: view.steps.length })}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {view.steps.length ? (
                    view.steps.map((step, index) => (
                      <ObservationRow
                        key={`${step.nodeId}-${index}`}
                        step={step}
                        index={index}
                        traceStatus={safeTrace.status}
                        onClick={() =>
                          setDetail({
                            id: `${step.nodeId}-${index}`,
                            kind: 'observation',
                            title: `${t('observationDetails')} · ${step.label || step.nodeId}`,
                            value: step,
                          })
                        }
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={Layers3}
                      text={
                        safeTrace.status === 'running' ? t('metricsPending') : t('noObservation')
                      }
                    />
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>

      {detail && (
        <DetailDialog
          key={`${detail.kind}-${detail.id}`}
          detail={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, id, title }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="text-indigo-600" size={17} />
      <h3 className="text-sm font-semibold text-slate-800" id={id}>
        {title}
      </h3>
    </div>
  );
}

function TraceSummary({ trace, models, onOpen }) {
  const { language, t } = useLanguage();
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarClock className="text-slate-400" size={17} />
          {t('monitorSummary')}
        </div>
        <BaseButton onClick={onOpen} size="sm" variant="secondary">
          {t('monitorDetails')}
          <ChevronRight size={14} />
        </BaseButton>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <InfoField label={t('startedAt')} value={formatDateTime(trace.startedAt, language)} />
        <InfoField label={t('endedAt')} value={formatDateTime(trace.endedAt, language)} />
        <InfoField label={t('models')} value={models.join(', ') || '—'} />
        <InfoField label={t('trace')} value={trace.runId || '—'} mono />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PayloadPreview label={t('traceInput')} value={trace.input} />
        <PayloadPreview label={t('traceOutput')} value={trace.output} />
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-slate-400">
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        <Icon size={16} />
      </div>
      <div className="text-xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function CategoryCard({ icon: Icon, title, count, emptyText, tone, onClick }) {
  const { t } = useLanguage();
  const tones = {
    cyan: 'bg-cyan-50 text-cyan-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <BaseButton
      aria-label={`${t('openDetails')}: ${title}`}
      className="group min-h-28 w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      onClick={onClick}
      size="auto"
      variant="plain"
    >
      <span className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon size={17} />
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-slate-600">
          {count}
          <ChevronRight size={14} />
        </span>
      </span>
      <span className="mt-3 block text-sm font-semibold text-slate-800">{title}</span>
      <span className="mt-1 block line-clamp-2 text-xs font-normal leading-5 text-slate-500">
        {count ? t('monitorDetails') : emptyText}
      </span>
    </BaseButton>
  );
}

function ObservationRow({ step, index, traceStatus, onClick }) {
  const { language, t } = useLanguage();
  const telemetry = step.telemetry || {};
  const status = observationStatus(step, traceStatus);
  const provider = telemetry.provider || step.output?.provider;
  const totalTokens = tokenTotal(telemetry);

  return (
    <button
      className="grid w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:grid-cols-[32px_minmax(0,1fr)_auto_18px] sm:items-center"
      onClick={onClick}
      type="button"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
        {index + 1}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-800">
            {step.label || step.nodeId}
          </span>
          <StatusBadge status={status} compact />
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">
            {step.type}
          </span>
        </span>
        <span className="mt-1 block truncate text-xs text-slate-500">
          {telemetry.model || provider || step.nodeId}
        </span>
      </span>
      <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums text-slate-600 sm:justify-end">
        {totalTokens !== undefined && (
          <span>
            {formatNumber(totalTokens, language)} {t('tokenUnit')}
          </span>
        )}
        {telemetry.costUsd !== undefined && <span>{formatCost(telemetry.costUsd)}</span>}
        <span>{formatLatency(step.latencyMs)}</span>
      </span>
      <ChevronRight className="text-slate-300" size={16} />
    </button>
  );
}

function StatusBadge({ status, compact = false }) {
  const { t } = useLanguage();
  const normalized = normalizeStatus(status);
  const styles = {
    success: {
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      label: t('statusSuccess'),
    },
    warning: {
      icon: TriangleAlert,
      tone: 'bg-amber-50 text-amber-700 ring-amber-200',
      label: t('statusWarning'),
    },
    error: {
      icon: AlertTriangle,
      tone: 'bg-rose-50 text-rose-700 ring-rose-200',
      label: t('statusError'),
    },
    running: {
      icon: LoaderCircle,
      tone: 'bg-blue-50 text-blue-700 ring-blue-200',
      label: t('statusRunning'),
    },
    idle: {
      icon: Info,
      tone: 'bg-slate-100 text-slate-600 ring-slate-200',
      label: t('statusIdle'),
    },
  }[normalized];
  const Icon = styles.icon;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ring-1 ${styles.tone} ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}`}
    >
      <Icon className={normalized === 'running' ? 'animate-spin' : ''} size={compact ? 10 : 11} />
      <span className="uppercase tracking-wide">{styles.label}</span>
    </span>
  );
}

function DetailDialog({ detail, onClose }: { detail: DetailSelection; onClose: () => void }) {
  const { t } = useLanguage();
  const tabs = detailTabs(detail.kind, t);
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-slate-950/55 p-4"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <section
        aria-label={detail.title}
        className="flex max-h-[calc(100vh-32px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.42)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-900">{detail.title}</h3>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <EyeOff size={12} />
              {t('sensitiveHidden')}
            </div>
          </div>
          <BaseButton onClick={onClose} size="icon-sm" title={t('closeModal')} variant="secondary">
            <X size={16} />
          </BaseButton>
        </header>

        <div className="border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <DetailContent activeTab={activeTab} detail={detail} />
        </div>
      </section>
    </div>
  );
}

function DetailContent({ activeTab, detail }) {
  if (activeTab === 'raw') return <JsonViewer value={detail.value} />;
  if (detail.kind === 'trace') return <TraceDetail trace={detail.value} tab={activeTab} />;
  if (detail.kind === 'observation')
    return <ObservationDetail step={detail.value} tab={activeTab} />;
  return <CollectionDetail items={detail.value} kind={detail.kind} />;
}

function TraceDetail({ trace, tab }) {
  const { language, t } = useLanguage();
  const view = buildMonitoringView(trace);
  if (tab === 'input-output') {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <PayloadPanel label={t('traceInput')} value={trace.input} />
        <PayloadPanel label={t('traceOutput')} value={trace.output} />
      </div>
    );
  }
  if (tab === 'metadata') {
    return (
      <div className="space-y-4">
        <PayloadPanel label={t('metadata')} value={trace.metadata || { tags: trace.tags }} />
        <PayloadPanel label="Variables" value={trace.variables} />
        <PayloadPanel label="Topological order" value={trace.topologicalOrder} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label={t('trace')} value={trace.runId || '—'} mono />
        <InfoField label={t('startedAt')} value={formatDateTime(trace.startedAt, language)} />
        <InfoField label={t('endedAt')} value={formatDateTime(trace.endedAt, language)} />
        <InfoField label={t('latency')} value={formatLatency(view.latencyMs)} />
        <InfoField label={t('observations')} value={String(view.steps.length)} />
        <InfoField label={t('generations')} value={String(view.generations.length)} />
        <InfoField label={t('models')} value={view.models.join(', ') || '—'} />
        <InfoField label={t('totalTokens')} value={formatNumber(view.totalTokens, language)} />
        <InfoField label={t('estimatedCost')} value={formatCost(view.totalCost)} />
      </div>
      {trace.error && <ErrorCard error={trace.error} />}
    </div>
  );
}

function ObservationDetail({ step, tab }) {
  const { language, t } = useLanguage();
  const telemetry = step.telemetry || {};
  const input = telemetry.prompt ?? telemetry.input ?? step.input ?? step.output?.query;

  if (tab === 'input-output') {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <PayloadPanel label={step.type === 'llm' ? t('prompt') : t('input')} value={input} />
        <PayloadPanel label={t('output')} value={step.output} />
      </div>
    );
  }
  if (tab === 'usage') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label={t('model')} value={telemetry.model || '—'} />
        <InfoField
          label={t('provider')}
          value={telemetry.provider || step.output?.provider || '—'}
        />
        <InfoField
          label={t('inputTokens')}
          value={formatOptionalNumber(telemetry.inputTokens, language)}
        />
        <InfoField
          label={t('cachedTokens')}
          value={formatOptionalNumber(telemetry.cachedInputTokens, language)}
        />
        <InfoField
          label={t('outputTokens')}
          value={formatOptionalNumber(telemetry.outputTokens, language)}
        />
        <InfoField
          label={t('totalTokens')}
          value={formatOptionalNumber(tokenTotal(telemetry), language)}
        />
        <InfoField label={t('cost')} value={formatCost(telemetry.costUsd)} />
        <InfoField label={t('latency')} value={formatLatency(step.latencyMs)} />
      </div>
    );
  }
  if (tab === 'metadata') {
    return <JsonViewer value={{ ...telemetry, prompt: undefined }} />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <InfoField label="Node ID" value={step.nodeId || '—'} mono />
      <InfoField label="Type" value={step.type || '—'} />
      <InfoField label={t('status')} value={normalizeStatus(observationStatus(step))} />
      <InfoField label={t('model')} value={telemetry.model || '—'} />
      <InfoField label={t('provider')} value={telemetry.provider || step.output?.provider || '—'} />
      <InfoField label={t('latency')} value={formatLatency(step.latencyMs)} />
    </div>
  );
}

function CollectionDetail({ items, kind }) {
  const { t } = useLanguage();
  const emptyCopy = {
    rag: [Database, t('noRag')],
    tools: [Wrench, t('noTools')],
    guardrails: [ShieldCheck, t('noGuardrails')],
    errors: [Bug, t('noErrors')],
  };
  if (!items.length) {
    const [Icon, text] = emptyCopy[kind];
    return <EmptyState icon={Icon} text={text} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        if (kind === 'errors') return <ErrorCard error={item} key={index} />;
        if (kind === 'rag') return <RetrievalCard item={item} key={index} />;
        if (kind === 'tools') return <ToolCard item={item} key={index} />;
        return <GuardrailCard item={item} key={index} />;
      })}
    </div>
  );
}

function RetrievalCard({ item }) {
  const { t } = useLanguage();
  const output = item.output || item;
  const results = Array.isArray(output.results) ? output.results : [];
  return (
    <article className="rounded-xl border border-cyan-200 bg-cyan-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            {item.label || item.nodeId || t('retrievals')}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            {output.provider || item.telemetry?.provider || '—'}
          </p>
        </div>
        <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-semibold text-cyan-800">
          {t('resultCount', { count: results.length })}
        </span>
      </div>
      <div className="mt-3">
        <InfoField label={t('query')} value={output.query || item.telemetry?.query || '—'} />
      </div>
      <div className="mt-3 space-y-2">
        {results.map((result, index) => (
          <div className="rounded-lg border border-slate-200 bg-white p-3" key={index}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 text-xs font-semibold text-slate-800">
                {result.title || `${t('source')} ${index + 1}`}
              </div>
              {result.score !== undefined && (
                <span className="text-[11px] text-slate-500">
                  {t('score')}: {formatScore(result.score)}
                </span>
              )}
            </div>
            {result.url && (
              <div className="mt-1 break-all font-mono text-[10px] text-cyan-700">{result.url}</div>
            )}
            {result.content && <ExpandableText className="mt-2" text={String(result.content)} />}
          </div>
        ))}
        {!results.length && <EmptyState icon={Database} text={t('noRag')} compact />}
      </div>
    </article>
  );
}

function ToolCard({ item }) {
  const { t } = useLanguage();
  const output = item.output || item;
  return (
    <article className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
      <div className="flex items-center gap-2">
        <Wrench className="text-violet-600" size={16} />
        <h4 className="text-sm font-semibold text-slate-900">
          {item.label || item.nodeId || output.action || t('toolsActions')}
        </h4>
      </div>
      <div className="mt-3">
        <PayloadPanel label={t('actionPayload')} value={output} />
      </div>
    </article>
  );
}

function GuardrailCard({ item }) {
  const { t } = useLanguage();
  const status = item.status || item.result || item.level || 'success';
  return (
    <article className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-amber-600" size={16} />
          <h4 className="text-sm font-semibold text-slate-900">
            {item.name || item.label || t('guardrails')}
          </h4>
        </div>
        <StatusBadge status={status} compact />
      </div>
      <div className="mt-3">
        <JsonViewer value={item} initialCollapsed />
      </div>
    </article>
  );
}

function ErrorCard({ error }) {
  const { t } = useLanguage();
  return (
    <article className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold">{error.nodeId || error.name || t('errors')}</div>
          {error.code && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-[10px]">
              {error.code}
            </span>
          )}
        </div>
        <ExpandableText
          className="mt-1 text-rose-800"
          text={String(error.message || error.statusMessage || error)}
        />
      </div>
    </article>
  );
}

function PayloadPreview({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-700">
        {formatCompactValue(value)}
      </div>
    </div>
  );
}

function PayloadPanel({ label, value }) {
  return (
    <section className="min-w-0">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </h4>
      <JsonViewer value={value} />
    </section>
  );
}

function JsonViewer({ value, initialCollapsed = false }) {
  const { t } = useLanguage();
  const [pretty, setPretty] = useState(true);
  const [expanded, setExpanded] = useState(!initialCollapsed);
  const safeValue = useMemo(() => sanitizeForDisplay(value), [value]);
  const jsonLike = isJsonLike(safeValue);
  const content = formatPayload(safeValue, pretty);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-2 py-1.5">
        <div className="flex items-center gap-1">
          <Braces className="text-slate-400" size={13} />
          {jsonLike && (
            <>
              <button
                className={`rounded px-2 py-1 text-[10px] font-semibold ${pretty ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setPretty(true)}
                type="button"
              >
                {t('prettyPrint')}
              </button>
              <button
                className={`rounded px-2 py-1 text-[10px] font-semibold ${!pretty ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                onClick={() => setPretty(false)}
                type="button"
              >
                {t('compactJson')}
              </button>
            </>
          )}
        </div>
        <button
          className="rounded px-2 py-1 text-[10px] font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? t('collapse') : t('expand')}
        </button>
      </div>
      {expanded ? (
        <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-5 text-slate-100">
          {content}
        </pre>
      ) : (
        <div className="truncate px-3 py-2 font-mono text-xs text-slate-300">{content}</div>
      )}
    </div>
  );
}

function ExpandableText({ text, className = '' }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 260;
  return (
    <div className={`text-xs leading-5 text-slate-600 ${className}`}>
      <span className="whitespace-pre-wrap break-words">
        {long && !expanded ? `${text.slice(0, 260)}…` : text}
      </span>
      {long && (
        <button
          className="ml-2 font-semibold text-indigo-600 hover:text-indigo-800"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? t('collapse') : t('expand')}
        </button>
      )}
    </div>
  );
}

function InfoField({ label, value, mono = false }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div
        className={`mt-1 truncate text-xs font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}
        title={String(value)}
      >
        {value ?? '—'}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text, compact = false }) {
  return (
    <div
      className={`grid place-items-center text-center text-slate-500 ${compact ? 'min-h-20 p-3' : 'min-h-40 p-6'}`}
    >
      <div>
        <Icon className="mx-auto mb-2 text-slate-300" size={compact ? 22 : 28} />
        <p className="text-xs leading-5">{text}</p>
      </div>
    </div>
  );
}

function EmptyMonitoring() {
  const { t } = useLanguage();
  return (
    <div className="grid min-h-[460px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div>
        <Activity className="mx-auto mb-3 text-slate-300" size={32} />
        <h3 className="text-sm font-semibold text-slate-800">{t('noTrace')}</h3>
        <p className="mt-1 text-sm text-slate-500">{t('noTraceHelp')}</p>
      </div>
    </div>
  );
}

function detailTabs(kind, t) {
  if (kind === 'trace') {
    return [
      { id: 'summary', label: t('monitorSummary') },
      { id: 'input-output', label: t('inputOutput') },
      { id: 'metadata', label: t('metadata') },
      { id: 'raw', label: t('rawData') },
    ];
  }
  if (kind === 'observation') {
    return [
      { id: 'summary', label: t('monitorSummary') },
      { id: 'input-output', label: t('inputOutput') },
      { id: 'usage', label: t('usageCosts') },
      { id: 'metadata', label: t('metadata') },
      { id: 'raw', label: t('rawData') },
    ];
  }
  return [
    { id: 'summary', label: t('monitorSummary') },
    { id: 'raw', label: t('rawData') },
  ];
}

function buildMonitoringView(trace) {
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  const generations = steps.filter(
    (step) => step.type === 'llm' || step.telemetry?.asType === 'generation',
  );
  const rag = steps.filter(
    (step) =>
      step.type === 'rag_search' ||
      step.type === 'web_search' ||
      step.telemetry?.asType === 'retriever',
  );
  const tools = steps.filter(
    (step) =>
      step.type === 'action' ||
      step.type === 'tool' ||
      step.telemetry?.asType === 'tool' ||
      Array.isArray(step.output?.toolCalls),
  );
  const guardrails = collectGuardrails(trace, steps);
  const errors = collectErrors(trace, steps);
  const tokenValues = generations.map((step) => tokenTotal(step.telemetry || {}));
  const totalTokens = tokenValues.reduce((total, value) => total + Number(value || 0), 0);
  const costs = generations
    .map((step) => step.telemetry?.costUsd)
    .filter((cost) => typeof cost === 'number' && Number.isFinite(cost));
  const totalCost = costs.length
    ? costs.reduce((total, cost) => total + Number(cost), 0)
    : undefined;
  const latencyMs = Number(
    trace?.latencyMs || steps.reduce((total, step) => total + Number(step.latencyMs || 0), 0),
  );
  const models = [
    ...new Set(
      generations
        .map((step) => step.telemetry?.model || step.model)
        .filter((model) => typeof model === 'string' && model),
    ),
  ];
  const status = errors.length
    ? 'error'
    : trace?.status === 'running'
      ? 'running'
      : guardrails.some((item) =>
            ['warning', 'error'].includes(
              normalizeStatus(item.status || item.result || item.level),
            ),
          )
        ? 'warning'
        : trace?.status === 'completed' || trace?.status === 'success' || trace?.status === 'ended'
          ? 'success'
          : trace?.status || 'idle';

  return {
    steps,
    generations,
    rag,
    tools,
    guardrails,
    errors,
    totalTokens,
    totalCost,
    latencyMs,
    models,
    status,
  };
}

function collectGuardrails(trace, steps) {
  const values = [trace?.guardrails, trace?.guardrailResults, trace?.evaluations, trace?.scores];
  for (const step of steps) {
    values.push(step.guardrails, step.telemetry?.guardrails, step.output?.guardrails);
    if (step.type === 'guardrail') values.push(step);
  }
  return values.flatMap((value) => (Array.isArray(value) ? value : value ? [value] : []));
}

function collectErrors(trace, steps) {
  const errors = trace?.error ? [trace.error] : [];
  for (const step of steps) {
    if (step.error) errors.push({ ...step.error, nodeId: step.error.nodeId || step.nodeId });
    if (normalizeStatus(step.status || step.level || step.telemetry?.level) === 'error') {
      errors.push({
        nodeId: step.nodeId,
        code: step.code || step.telemetry?.code,
        message:
          step.message ||
          step.statusMessage ||
          step.telemetry?.statusMessage ||
          'Observation failed.',
      });
    }
  }
  return errors;
}

function observationStatus(step, traceStatus = 'success') {
  return (
    step.status ||
    step.level ||
    step.telemetry?.level ||
    (traceStatus === 'running' ? 'success' : 'success')
  );
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (
    ['completed', 'complete', 'success', 'successful', 'ok', 'passed', 'pass', 'ended'].includes(
      value,
    )
  )
    return 'success';
  if (['warning', 'warn', 'blocked', 'failed-check'].includes(value)) return 'warning';
  if (['error', 'failed', 'failure', 'fatal'].includes(value)) return 'error';
  if (['running', 'pending', 'started', 'processing'].includes(value)) return 'running';
  return 'idle';
}

function tokenTotal(telemetry) {
  if (telemetry.totalTokens !== undefined) return Number(telemetry.totalTokens);
  if (telemetry.usageDetails?.total !== undefined) return Number(telemetry.usageDetails.total);
  const input = Number(telemetry.inputTokens ?? telemetry.usageDetails?.input);
  const output = Number(telemetry.outputTokens ?? telemetry.usageDetails?.output);
  return Number.isFinite(input) || Number.isFinite(output)
    ? (Number.isFinite(input) ? input : 0) + (Number.isFinite(output) ? output : 0)
    : undefined;
}

function sanitizeForDisplay(value, key = '', seen = new WeakSet(), depth = 0) {
  if (isSensitiveKey(key)) return '[REDACTED]';
  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  if (typeof value === 'string') return redactSensitiveString(value);
  if (depth > 12) return '[MAX_DEPTH]';
  if (typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => sanitizeForDisplay(item, key, seen, depth + 1));
    seen.delete(value);
    return result;
  }
  const result = {};
  Object.entries(value).forEach(([childKey, childValue]) => {
    result[childKey] = sanitizeForDisplay(childValue, childKey, seen, depth + 1);
  });
  seen.delete(value);
  return result;
}

function isSensitiveKey(key) {
  const normalized = String(key)
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
  return [
    'apikey',
    'secret',
    'secretkey',
    'password',
    'passwd',
    'authorization',
    'cookie',
    'setcookie',
    'privatekey',
    'clientsecret',
    'accesstoken',
    'refreshtoken',
    'idtoken',
    'credential',
    'credentials',
    'jwt',
  ].some((name) => normalized === name || normalized.endsWith(name));
}

function redactSensitiveString(value) {
  return value
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_API_KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]')
    .replace(/(postgres(?:ql)?:\/\/[^:@/\s]+:)[^@/\s]+(@)/gi, '$1[REDACTED]$2')
    .replace(/([?&](?:api[_-]?key|access[_-]?token|token|key)=)[^&#\s]+/gi, '$1[REDACTED]');
}

function isJsonLike(value) {
  if (value && typeof value === 'object') return true;
  if (typeof value !== 'string') return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function formatPayload(value, pretty = true) {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'string') {
    if (!pretty) return value;
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, pretty ? 2 : 0);
}

function formatCompactValue(value) {
  if (value === undefined || value === null || value === '') return '—';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function formatLatency(value) {
  const milliseconds = Number(value || 0);
  return milliseconds >= 1000
    ? `${(milliseconds / 1000).toFixed(2)} s`
    : `${Math.round(milliseconds)} ms`;
}

function formatNumber(value, language = 'en') {
  return Number(value || 0).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
}

function formatOptionalNumber(value, language) {
  return value === undefined || value === null ? '—' : formatNumber(value, language);
}

function formatCost(value) {
  if (value === undefined || value === null || value === '') return '—';
  const cost = Number(value);
  if (!Number.isFinite(cost)) return '—';
  if (cost > 0 && cost < 0.000001) return `$${cost.toFixed(8)}`;
  return `$${cost.toFixed(6)}`;
}

function formatDateTime(value, language) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function formatScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(3) : String(value);
}
