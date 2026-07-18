import type { HTMLAttributes, ReactNode } from 'react';

type BaseCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  selected?: boolean;
};

export function BaseCard({ children, selected = false, className = '', ...props }: BaseCardProps) {
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-panel transition-[border-color,box-shadow] ${selected ? 'border-slate-950 ring-2 ring-slate-300' : 'border-slate-200'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
