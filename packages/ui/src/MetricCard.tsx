import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { cn } from './utils';

export type MetricTrend = 'up' | 'down' | 'neutral';

export interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: string;
  trend?: MetricTrend;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const trendStyles: Record<MetricTrend, string> = {
  up: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  down: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  neutral: 'bg-slate-500/10 text-slate-600 dark:text-zinc-400',
};

export function MetricCard({
  title,
  value,
  delta,
  trend = 'neutral',
  subtitle,
  icon,
  footer,
  className,
  onClick,
}: MetricCardProps) {
  const { classes, motion: themeMotion, cardRadius } = useTheme();

  const TrendIcon =
    trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

  return (
    <motion.div
      initial={themeMotion.isAnimated ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick || themeMotion.isAnimated ? themeMotion.hoverLift : undefined}
      transition={themeMotion.transition}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden p-5 transition-colors',
        classes.card,
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 truncate">
            {title}
          </p>
          <p className="text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-zinc-50">
            {value}
          </p>
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center bg-primary/10 text-primary',
              cardRadius === 'rounded-3xl' ? 'rounded-2xl' : cardRadius,
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(delta || subtitle) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-2 py-0.5 font-semibold',
                classes.badge,
                trendStyles[trend],
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {delta}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-500 dark:text-zinc-400 truncate">{subtitle}</span>
          )}
        </div>
      )}

      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/80">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
