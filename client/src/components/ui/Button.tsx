import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white font-bold border border-transparent shadow-xs focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2',
  secondary:
    'bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 border-2 border-stone-900 font-bold shadow-xs focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2',
  outline:
    'bg-transparent hover:bg-stone-100 active:bg-stone-200 text-stone-800 border-2 border-stone-300 font-bold focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2',
  ghost:
    'bg-transparent hover:bg-stone-100 active:bg-stone-200 text-stone-800 font-semibold border border-transparent focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2',
  destructive:
    'bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold border border-transparent shadow-xs focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-none',
  md: 'h-10 px-4 text-sm gap-2 rounded-none',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-none min-h-[44px]',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isActuallyDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isActuallyDisabled}
        aria-busy={isLoading ? 'true' : undefined}
        aria-disabled={isActuallyDisabled ? 'true' : undefined}
        className={`inline-flex items-center justify-center font-display tracking-tight transition-colors duration-150 outline-none select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <Loader2 className={`animate-spin shrink-0 ${iconSizes[size]}`} aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

