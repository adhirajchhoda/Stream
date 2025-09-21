import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative tap-highlight-none',
  {
    variants: {
      variant: {
        primary: 'bg-blue text-white hover:bg-blue/90',
        secondary: 'bg-white border border-border text-charcoal hover:bg-white',
        ghost: 'bg-transparent text-charcoal hover:bg-black/5',
        outline: 'bg-transparent border border-border text-charcoal hover:border-blue hover:text-blue',
      },
      size: {
        sm: 'px-3 py-2 text-caption h-8',
        md: 'px-5 py-3 text-button h-11',
        lg: 'px-6 py-4 text-button h-12',
        xl: 'px-8 py-5 text-headline h-14',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin relative z-10" />}
        {!loading && leftIcon && <span className="mr-2 flex items-center relative z-10">{leftIcon}</span>}
        <span className="relative z-10">{children}</span>
        {!loading && rightIcon && <span className="ml-2 flex items-center relative z-10">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';