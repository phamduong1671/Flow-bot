import type { ButtonHTMLAttributes, ReactNode } from 'react';

type BaseButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'plain';
type BaseButtonSize = 'auto' | 'sm' | 'md' | 'icon-sm' | 'icon-md';

type BaseButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  variant?: BaseButtonVariant;
  size?: BaseButtonSize;
};

const variantClass: Record<BaseButtonVariant, string> = {
  primary: 'bg-slate-950 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-300',
  secondary:
    'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:bg-slate-100',
  danger:
    'border border-slate-200 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600',
  ghost: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600',
  plain: '',
};

const sizeClass: Record<BaseButtonSize, string> = {
  auto: '',
  sm: 'inline-flex h-9 items-center justify-center gap-2 px-3 text-xs',
  md: 'inline-flex h-10 items-center justify-center gap-2 px-4 text-sm',
  'icon-sm': 'grid h-8 w-8 place-items-center',
  'icon-md': 'grid h-10 w-10 place-items-center',
};

export function BaseButton({
  children,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}: BaseButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-md font-semibold transition disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
