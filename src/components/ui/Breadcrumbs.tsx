import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center flex-wrap gap-1.5 text-xs font-medium text-slate-400 py-2 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80 ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1 || item.active;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}
            {item.onClick && !isLast ? (
              <button
                onClick={item.onClick}
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
              >
                {index === 0 && !item.icon && <Home className="w-3.5 h-3.5" />}
                {item.icon}
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{item.label}</span>
              </button>
            ) : (
              <span
                className={`inline-flex items-center gap-1.5 font-bold truncate max-w-[160px] sm:max-w-[240px] ${
                  isLast ? 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20' : 'text-slate-300'
                }`}
              >
                {index === 0 && !item.icon && <Home className="w-3.5 h-3.5 text-emerald-400" />}
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
