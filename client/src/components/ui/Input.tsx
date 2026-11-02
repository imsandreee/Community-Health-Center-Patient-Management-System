import React, { forwardRef, useId } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id: customId,
      label,
      error,
      helperText,
      required,
      startIcon,
      endIcon,
      containerClassName = '',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || `input-${generatedId}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = [
      error ? errorId : null,
      !error && helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-stone-700">
            {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none text-stone-500">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`w-full h-10 ${startIcon ? 'pl-9' : 'pl-3'} ${
              endIcon ? 'pr-9' : 'pr-3'
            } text-base md:text-sm bg-white border ${
              error
                ? 'border-red-500 focus:ring-2 focus:ring-red-600 focus:border-red-600'
                : 'border-stone-300 focus:ring-2 focus:ring-indigo-700 focus:border-indigo-700'
            } rounded-none text-stone-900 placeholder:text-stone-400 focus:outline-none transition-colors disabled:bg-stone-100 disabled:text-stone-500 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 inset-y-0 flex items-center pointer-events-none text-stone-500">
              {endIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-red-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-stone-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

