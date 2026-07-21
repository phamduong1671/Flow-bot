import { Activity, RotateCcw, X } from 'lucide-react';
import { BaseButton } from '../../../components/base/BaseButton';
import { BaseInput } from '../../../components/base/BaseInput';

export function RunnerPanel({
  runner,
  onRestart,
  onClose,
  onOpenMonitoring,
  rightPanelOpen,
  input,
  onInputChange,
  onSubmit,
}) {
  if (!runner.open) return null;
  const conversationMessages = runner.messages.filter(isConversationMessage);

  return (
    <section
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className="fixed bottom-5 z-30 flex h-[460px] w-[420px] max-w-[calc(100vw-40px)] flex-col rounded-lg border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)] transition-[right] duration-300"
      style={{ right: rightPanelOpen ? 360 : 20 }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">Flow Runner</div>
          <div className="text-xs capitalize text-slate-500">{runner.status}</div>
        </div>
        <div className="flex gap-2">
          <BaseButton
            onClick={onOpenMonitoring}
            variant="secondary"
            size="icon-sm"
            className="text-slate-600"
            title="LLM monitoring"
          >
            <Activity size={16} />
          </BaseButton>
          <BaseButton
            onClick={onRestart}
            variant="secondary"
            size="icon-sm"
            className="text-slate-600"
            title="Restart runner"
          >
            <RotateCcw size={15} />
          </BaseButton>
          <BaseButton
            onClick={onClose}
            variant="secondary"
            size="icon-sm"
            className="text-slate-600"
            title="Close runner"
          >
            <X size={16} />
          </BaseButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto bg-slate-50 p-4">
        {conversationMessages.length === 0 && runner.status !== 'running' ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            {runner.status === 'waiting'
              ? 'Enter your message below to start the workflow.'
              : runner.status === 'error'
                ? 'Run failed. Open LLM monitoring for details.'
                : 'Click Run to start the flow.'}
          </div>
        ) : (
          conversationMessages.map((message) => (
            <RunnerMessage key={message.id} message={message} />
          ))
        )}
        {runner.status === 'running' && <TypingIndicator />}
      </div>

      <form onSubmit={onSubmit} className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <BaseInput
            value={input}
            onChange={onInputChange}
            disabled={runner.status !== 'waiting'}
            placeholder={
              runner.status === 'waiting'
                ? 'Type your answer...'
                : 'Runner is not waiting for input'
            }
            className="min-w-0 flex-1"
          />
          <BaseButton type="submit" disabled={runner.status !== 'waiting'} variant="primary">
            Send
          </BaseButton>
        </div>
      </form>
    </section>
  );
}

function isConversationMessage(message) {
  return message.role === 'user' || message.role === 'bot';
}

function TypingIndicator() {
  return (
    <div
      aria-label="Bot is typing"
      className="flex w-fit items-center gap-1 rounded-lg bg-white px-3 py-3 shadow-sm"
      role="status"
    >
      {[0, 1, 2].map((dot) => (
        <span
          aria-hidden="true"
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          key={dot}
          style={{ animationDelay: `${dot * 140}ms` }}
        />
      ))}
      <span className="sr-only">Bot is typing</span>
    </div>
  );
}

function RunnerMessage({ message }) {
  const tone =
    message.role === 'user'
      ? 'ml-auto bg-slate-950 text-white'
      : 'bg-white text-slate-800 shadow-sm';

  return <div className={`max-w-[86%] rounded-lg px-3 py-2 text-sm ${tone}`}>{message.text}</div>;
}
