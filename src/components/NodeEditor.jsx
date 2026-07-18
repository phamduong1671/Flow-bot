export function NodeEditor({ node, onChange }) {
  const fields = Object.keys(node.data);

  return (
    <div className="mt-4 space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Label
        </span>
        <input
          value={node.label}
          onChange={(event) => onChange('label', event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
        />
      </label>

      {fields.map((field) => {
        const value = node.data[field];
        const multiline = field === 'message' || field === 'payload';

        return (
          <label key={field} className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {field}
            </span>
            {multiline ? (
              <textarea
                value={value}
                onChange={(event) => onChange(field, event.target.value)}
                rows={field === 'payload' ? 4 : 3}
                className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
              />
            ) : (
              <input
                value={value}
                onChange={(event) => onChange(field, event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900"
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
