import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value: ReactNode;
  description: string;
  icon: IconType;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-lg border p-5',
        highlight ? 'border-cyan-200 bg-cyan-50/70' : 'border-slate-200 bg-slate-50/80',
      ].join(' ')}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</p>
        <Icon
          className={highlight ? 'shrink-0 text-cyan-600' : 'shrink-0 text-gray-400'}
          size={20}
        />
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">{description}</p>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100/60 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-800">{title}</h2>
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-10 text-center">
      <p className="text-sm font-bold text-gray-500">{text}</p>
    </div>
  );
}

export function ErrorBox({
  message,
  detail,
  suggestion,
}: {
  message: string;
  detail: string;
  suggestion?: string;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <p className="font-bold text-red-700">{message}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-red-500">
        Detalle técnico
      </p>
      <p className="mt-1 text-sm text-red-600">{detail}</p>
      {suggestion ? (
        <p className="mt-3 rounded-md border border-red-200 bg-white/70 p-3 text-sm text-red-700">
          {suggestion}
        </p>
      ) : null}
    </div>
  );
}
