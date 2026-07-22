import type { InputHTMLAttributes } from 'react';

type BaseInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label?: string;
  value: string;
  onChange: (value: string) => void;
};

export function BaseInput({
  label,
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
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {input}
    </label>
  );
}
