import type { TextareaHTMLAttributes } from 'react';

type BaseTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  label?: string;
  helpText?: string;
  value: string;
  onChange: (value: string) => void;
};

export function BaseTextarea({
  label,
  helpText,
  value,
  onChange,
  className = '',
  ...props
}: BaseTextareaProps) {
  const textarea = (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 ${className}`}
      {...props}
    />
  );

  if (!label) return textarea;

  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {helpText && (
          <span
            aria-label={helpText}
            className="grid h-4 w-4 place-items-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-500"
            title={helpText}
          >
            ?
          </span>
        )}
      </span>
      {textarea}
    </label>
  );
}
