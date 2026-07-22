import type { TextareaHTMLAttributes } from 'react';

type BaseTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

export function BaseTextarea({
  label,
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
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {textarea}
    </label>
  );
}
