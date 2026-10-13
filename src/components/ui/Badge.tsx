import React from 'react';

export type BadgeVariant =
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'slate'
  | 'blue'
  | 'purple'
  | 'success'
  | 'danger'
  | 'warning'
  | 'secondary'
  | 'default'
  | 'neutral'
  | 'info'
  | 'outline';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  icon,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const normalizedVariant: 'emerald' | 'rose' | 'amber' | 'slate' | 'blue' | 'purple' =
    variant === 'success'
      ? 'emerald'
      : variant === 'danger'
      ? 'rose'
      : variant === 'warning'
      ? 'amber'
      : variant === 'info'
      ? 'blue'
      : variant === 'secondary' || variant === 'default' || variant === 'neutral' || variant === 'outline'
      ? 'slate'
      : (variant as 'emerald' | 'rose' | 'amber' | 'slate' | 'blue' | 'purple');

  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium',
    slate: 'bg-slate-800 text-slate-300 border border-slate-700 font-medium',
    blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/30 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-sans whitespace-nowrap uppercase tracking-wider ${sizeStyles[size]} ${variantStyles[normalizedVariant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
