import type { ReactNode } from 'react';

export function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
