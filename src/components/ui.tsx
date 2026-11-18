import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Info, X } from 'lucide-react';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export function StatusText({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: StatusTone;
}) {
  const styles: Record<StatusTone, { text: string; Icon: React.ComponentType<{ className?: string }> }> = {
    success: { text: 'text-[var(--status-success)]', Icon: CheckCircle2 },
    warning: { text: 'text-[var(--status-warning)]', Icon: Clock },
    error: { text: 'text-[var(--status-error)]', Icon: AlertCircle },
    info: { text: 'text-[var(--status-info)]', Icon: Info },
    neutral: { text: 'text-[var(--text-secondary)]', Icon: Info },
  };
  const { text, Icon } = styles[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${text}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 border border-[var(--border-hairline)] rounded-[10px] bg-[var(--bg-surface)]">
      <div className="w-10 h-10 rounded-[8px] bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-3">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ToastBanner({
  message,
  tone = 'info',
  onClose,
}: {
  message: string;
  tone?: StatusTone;
  onClose: () => void;
}) {
  const toneBorder: Record<StatusTone, string> = {
    success: 'border-[var(--status-success)] text-[var(--status-success)] bg-[var(--status-success-bg)]',
    warning: 'border-[var(--status-warning)] text-[var(--status-warning)] bg-[var(--status-warning-bg)]',
    error: 'border-[var(--status-error)] text-[var(--status-error)] bg-[var(--status-error-bg)]',
    info: 'border-[var(--status-info)] text-[var(--status-info)] bg-[var(--status-info-bg)]',
    neutral: 'border-[var(--border-strong)] text-[var(--text-primary)] bg-[var(--bg-surface)]',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 max-w-md flex items-start gap-3 px-4 py-3 rounded-[10px] border shadow-[var(--shadow-md)] ${toneBorder[tone]}`}
    >
      <div className="text-xs font-medium leading-relaxed flex-1">{message}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Bildirimi kapat"
        className="p-0.5 rounded hover:opacity-75 transition-opacity shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Veriler yükleniyor">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-10 w-full rounded-[8px] bg-[var(--bg-subtle)] animate-pulse"
        />
      ))}
    </div>
  );
}
