import type { InputHTMLAttributes } from 'react';

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label?: string;
  helpText?: string;
  value: string;
  onChange: (value: string) => void;
};

export function BaseInput({
  label,
  helpText,
  value,
  onChange,
  className = '',
  ...props
}: BaseInputProps) {
  const input = (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100 ${className}`}
      {...props}
    />
  );

  if (!label) return input;

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
      {input}
    </label>
  );
}
