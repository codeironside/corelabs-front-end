import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  id?: string;
  'aria-label'?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  placeholder?: string;
  icon?: ReactNode;
}

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  id,
  'aria-label': ariaLabel,
  className = '',
  buttonClassName = '',
  disabled = false,
  placeholder = 'SelectΓÇª',
  icon,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 text-left rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-dark shadow-sm transition-colors hover:border-[var(--color-muted-olive)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-muted-olive)]/20 focus:border-[var(--color-muted-olive)] disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">{current?.label ?? placeholder}</span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="studio-dropdown-panel absolute z-[80] mt-1.5 w-full max-h-60 overflow-auto rounded-xl border border-border bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={String(opt.value)} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    active ? 'bg-[var(--color-tea-green)]/45 text-[var(--color-ash-brown)] font-medium' : 'text-dark hover:bg-white'
                  }`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && <Check size={14} className="shrink-0 text-[var(--color-ash-brown)]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

