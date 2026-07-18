import type { SelectHTMLAttributes } from 'react';

type BaseSelectOption = {
  label: string;
  value: string;
};

type BaseSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  label?: string;
  options: BaseSelectOption[];
  value: string;
  onChange: (value: string) => void;
};

export function BaseSelect({
  label,
  options,
  value,
  onChange,
  className = '',
  ...props
}: BaseSelectProps) {
  const select = (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900 ${className}`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {select}
    </label>
  );
}
