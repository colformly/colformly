import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@colformly/theme';
import { cn } from './utils';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  badge?: string | number;
  active?: boolean;
  onClick?: () => void;
}

export interface FloatingNavProps {
  /** 'top' for marketing/header navbar, 'sidebar' for desktop left sidebar + mobile bottom dock */
  variant?: 'top' | 'sidebar';
  brand?: ReactNode;
  items: NavItem[];
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Custom link renderer (e.g. React Router Link) */
  renderLink?: (item: NavItem, className: string, content: ReactNode) => ReactNode;
}

export function FloatingNav({
  variant = 'sidebar',
  brand,
  items,
  actions,
  footer,
  className,
  renderLink,
}: FloatingNavProps) {
  const { layoutMode, cardRadius, classes, motion: themeMotion } = useTheme();
  const isFloating = layoutMode === 'floating';

  const renderItem = (item: NavItem, compact = false) => {
    const baseCls = cn(
      'relative flex items-center transition-colors font-medium select-none',
      compact ? 'flex-col justify-center gap-1 px-3 py-1.5 text-[11px]' : 'gap-3 px-3.5 py-2.5 text-sm',
      cardRadius === 'rounded-3xl' ? 'rounded-2xl' : cardRadius,
      item.active
        ? 'text-white'
        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-muted/70',
    );

    const content = (
      <>
        {item.active && (
          <motion.span
            layoutId={`colformly-nav-pill-${variant}-${compact ? 'm' : 'd'}`}
            transition={themeMotion.transition}
            className={cn(
              'absolute inset-0 bg-primary shadow-sm',
              cardRadius === 'rounded-3xl' ? 'rounded-2xl' : cardRadius,
            )}
          />
        )}
        <span className="relative z-10 flex items-center gap-2.5">
          {item.icon && <span className="shrink-0">{item.icon}</span>}
          <span className={compact ? 'truncate max-w-[68px]' : 'truncate'}>{item.label}</span>
        </span>
        {!compact && item.badge !== undefined && (
          <span
            className={cn(
              'relative z-10 ml-auto px-2 py-0.5 text-[11px] font-semibold',
              classes.badge,
              item.active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary',
            )}
          >
            {item.badge}
          </span>
        )}
      </>
    );

    if (renderLink) {
      return <div key={item.id}>{renderLink(item, baseCls, content)}</div>;
    }

    if (item.href) {
      return (
        <a key={item.id} href={item.href} onClick={item.onClick} className={baseCls}>
          {content}
        </a>
      );
    }

    return (
      <button key={item.id} type="button" onClick={item.onClick} className={cn(baseCls, 'w-full text-left')}>
        {content}
      </button>
    );
  };

  // ── Variant 1: Top Navigation Bar ─────────────────────────────
  if (variant === 'top') {
    return (
      <header
        className={cn(
          'sticky z-40 w-full transition-all',
          isFloating ? 'top-4 px-4' : 'top-0 px-0',
          className,
        )}
      >
        <nav
          aria-label="Primary Navigation"
          className={cn(
            'flex items-center justify-between gap-4 px-5 py-3',
            classes.topNav,
          )}
        >
          {brand && <div className="shrink-0">{brand}</div>}
          <div className="hidden md:flex items-center gap-1">
            {items.map((item) => renderItem(item, false))}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </nav>
      </header>
    );
  }

  // ── Variant 2: Desktop Left Sidebar + Mobile Bottom Dock ──────
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        aria-label="Sidebar Navigation"
        className={cn(
          'hidden md:flex flex-col w-64 shrink-0 z-30 transition-all',
          isFloating ? 'fixed left-4 top-4 bottom-4 p-4' : 'sticky top-0 h-screen p-4',
          classes.sidebar,
          className,
        )}
      >
        {brand && <div className="px-2 pb-5 mb-2 border-b border-slate-200/60 dark:border-zinc-800/80">{brand}</div>}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto py-1">
          {items.map((item) => renderItem(item, false))}
        </nav>
        {footer && (
          <div className="pt-4 mt-3 border-t border-slate-200/60 dark:border-zinc-800/80">
            {footer}
          </div>
        )}
      </aside>

      {/* Mobile Bottom Floating / Docked Bar */}
      <nav
        aria-label="Mobile Navigation"
        className={cn(
          'md:hidden fixed z-40 flex items-center justify-around px-2 py-2',
          isFloating ? 'left-3 right-3 bottom-3' : 'left-0 right-0 bottom-0',
          classes.mobileNav,
        )}
      >
        {items.slice(0, 5).map((item) => renderItem(item, true))}
      </nav>
    </>
  );
}
