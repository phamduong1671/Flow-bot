import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { BaseButton } from './BaseButton';

type BaseModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function BaseModal({ open, title, children, onClose }: BaseModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-4" onClick={onClose}>
      <section
        className="mx-auto mt-16 max-w-lg rounded-lg bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <BaseButton variant="secondary" size="icon-sm" onClick={onClose} title="Close modal">
            <X size={16} />
          </BaseButton>
        </header>
        <div className="p-4">{children}</div>
      </section>
    </div>
  );
}
