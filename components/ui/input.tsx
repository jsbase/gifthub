import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex',
          // 44px rather than shadcn's 40px: this form is filled in on a phone,
          // in a hallway, by someone in a hurry.
          'h-11',
          'w-full',
          'rounded-md',
          'border',
          'border-input',
          'bg-transparent',
          'px-3',
          'text-[0.9375rem]',
          'transition-colors',
          'placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed',
          'disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
