import { RotateCcw, X } from 'lucide-react';

export function RunnerPanel({ runner, onRestart, onClose, input, onInputChange, onSubmit }) {
  if (!runner.open) return null;

  return (
    <section
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className="fixed bottom-5 left-1/2 z-30 flex h-[460px] w-[420px] -translate-x-1/2 flex-col rounded-lg border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">Flow Runner</div>
          <div className="text-xs capitalize text-slate-500">{runner.status}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Restart runner"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Close runner"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto bg-slate-50 p-4">
        {runner.messages.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Click Run to start the flow.
          </div>
        ) : (
          runner.messages.map((message) => <RunnerMessage key={message.id} message={message} />)
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            disabled={runner.status !== 'waiting'}
            placeholder={
              runner.status === 'waiting'
                ? 'Type your answer...'
                : 'Runner is not waiting for input'
            }
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={runner.status !== 'waiting'}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

function RunnerMessage({ message }) {
  const tone =
    message.role === 'user'
      ? 'ml-auto bg-slate-950 text-white'
      : message.role === 'bot'
        ? 'bg-white text-slate-800 shadow-sm'
        : message.role === 'error'
          ? 'bg-rose-50 text-rose-700'
          : 'bg-indigo-50 text-indigo-800';

  return <div className={`max-w-[86%] rounded-lg px-3 py-2 text-sm ${tone}`}>{message.text}</div>;
}
