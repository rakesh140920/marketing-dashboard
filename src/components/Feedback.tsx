import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Info } from 'lucide-react';

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function Loading() {
  return (
    <div className="center">
      <Spinner />
    </div>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon size={34} />
      <h3>{title}</h3>
      {children && <div className="small">{children}</div>}
    </div>
  );
}

export function Banner({ kind = 'info', children }: { kind?: 'info' | 'warn'; children: ReactNode }) {
  const Icon = kind === 'warn' ? AlertTriangle : Info;
  return (
    <div className={`banner panel ${kind}`}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}
