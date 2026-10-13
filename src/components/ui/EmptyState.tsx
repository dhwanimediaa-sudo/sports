import React from 'react';
import { Layers } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  badgeText?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  badgeText,
  action,
  actionLabel,
  onAction,
  icon = <Layers className="w-10 h-10 text-slate-600" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner mb-4">
        {icon}
      </div>
      {badgeText && (
        <span className="px-3 py-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full uppercase tracking-wider mb-3">
          {badgeText}
        </span>
      )}
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">{description}</p>
      {action ? (
        <div className="mt-6">{action}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-6">
          <Button onClick={onAction} variant="emerald" size="sm">
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
