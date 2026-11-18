import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useTheme } from '@colformly/theme';
import { cn } from './utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-sm hover:brightness-110',
  secondary: 'bg-secondary text-white shadow-sm hover:brightness-110',
  outline:
    'border border-slate-300 dark:border-zinc-700 bg-transparent text-slate-800 dark:text-zinc-100 hover:bg-muted',
  ghost: 'bg-transparent text-slate-700 dark:text-zinc-200 hover:bg-muted',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { buttonRadius, motion: themeMotion } = useTheme();
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? undefined : { scale: themeMotion.isAnimated ? 1.02 : 1 }}
        whileTap={isDisabled ? undefined : { scale: themeMotion.tapScale }}
        transition={themeMotion.transition}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-semibold tracking-tight transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed select-none',
          buttonRadius,
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...(props as Record<string, unknown>)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
