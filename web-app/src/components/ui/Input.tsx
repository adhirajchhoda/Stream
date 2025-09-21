import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const inputVariants = cva(
  'w-full rounded-lg px-4 py-3 text-body placeholder:text-gray-400 transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm',
  {
    variants: {
      variant: {
        default: 'border border-gray-200/60 bg-white/90 hover:border-gray-300/70 focus:border-stream-blue-500 focus:bg-white focus:ring-2 focus:ring-stream-blue-500/20 focus:shadow-stream',
        error: 'border border-red-300/60 bg-red-50/50 hover:border-red-400/70 focus:border-red-500 focus:bg-red-50/70 focus:ring-2 focus:ring-red-500/20',
        success: 'border border-stream-green-300/60 bg-stream-green-50/50 hover:border-stream-green-400/70 focus:border-stream-green-500 focus:bg-stream-green-50/70 focus:ring-2 focus:ring-stream-green-500/20',
        glass: 'backdrop-blur-glass-lg border border-white/25 bg-white/15 text-white placeholder:text-white/60 hover:bg-white/20 hover:border-white/35 focus:border-white/50 focus:bg-white/25 focus:ring-2 focus:ring-white/20',
        modern: 'border border-gray-200/50 bg-gradient-to-r from-white/95 to-gray-50/95 backdrop-blur-glass hover:from-white hover:to-gray-50 focus:border-stream-blue-500 focus:ring-2 focus:ring-stream-blue-500/20 focus:shadow-glass',
      },
      size: {
        sm: 'px-3 py-2 text-footnote h-9',
        md: 'px-4 py-3 text-body h-11',
        lg: 'px-6 py-4 text-callout h-13',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, label, error, success, helper, leftIcon, rightIcon, ...props }, ref) => {
    const finalVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-callout font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 peer-focus:text-stream-blue-500">
              {leftIcon}
            </div>
          )}
          <input
            className={cn(
              inputVariants({ variant: finalVariant, size }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              'peer',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 peer-focus:text-stream-blue-500">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-caption2 text-red-500">{error}</p>
        )}
        {success && (
          <p className="text-caption2 text-stream-green-600">{success}</p>
        )}
        {helper && !error && !success && (
          <p className="text-caption2 text-gray-500">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea component
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size, label, error, success, helper, ...props }, ref) => {
    const finalVariant = error ? 'error' : success ? 'success' : variant;

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-callout font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            inputVariants({ variant: finalVariant, size }),
            'min-h-[80px] resize-y',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-caption2 text-red-500">{error}</p>
        )}
        {success && (
          <p className="text-caption2 text-stream-green-600">{success}</p>
        )}
        {helper && !error && !success && (
          <p className="text-caption2 text-gray-500">{helper}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';