import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { cn } from './utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface BaseModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  hideCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function BaseModal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  hideCloseButton = false,
  closeOnBackdrop = true,
  children,
  footer,
  className,
}: BaseModalProps) {
  const { classes, motion: themeMotion, cardRadius } = useTheme();

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'colformly-modal-title' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={
              themeMotion.isAnimated
                ? { opacity: 0, scale: 0.94, y: 16 }
                : { opacity: 0, scale: 0.98 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              themeMotion.isAnimated
                ? { opacity: 0, scale: 0.95, y: 10 }
                : { opacity: 0, scale: 0.98 }
            }
            transition={themeMotion.transition}
            className={cn(
              'relative z-10 w-full overflow-hidden',
              sizeClasses[size],
              classes.modal,
              className,
            )}
          >
            {(title || !hideCloseButton) && (
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200/70 dark:border-zinc-800/80">
                <div className="space-y-0.5">
                  {title && (
                    <h2
                      id="colformly-modal-title"
                      className="text-lg font-display font-bold tracking-tight"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-slate-500 dark:text-zinc-400">{description}</p>
                  )}
                </div>
                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close modal"
                    className={cn(
                      'p-1.5 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-muted transition-colors',
                      cardRadius === 'rounded-3xl' ? 'rounded-full' : cardRadius,
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200/70 dark:border-zinc-800/80 bg-muted/40">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
