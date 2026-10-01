import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * A ruled space printed on the sheet, not a grey box.
 *
 * The ground is transparent so the label stock underneath shows through, which
 * is how a field looks on a real printed form: there is no fill, there is a
 * rule. The rule is the structural `--rule` value, which clears 4.5:1 on the
 * label stock, so the boundary is legible rather than decorative.
 *
 * 44px, because this form is filled in on a phone, in a hallway, by someone in a
 * hurry. The visible `label-print` caption above each field is the caller's job
 * (`FormField`), and it exists because a placeholder is not a label: it vanishes
 * the moment the field is filled and a screen reader meets it only once.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex',
          'h-11',
          'w-full',
          'rounded-md',
          'border',
          'border-rule',
          'bg-transparent',
          'px-3',
          'text-[0.9375rem]',
          'leading-normal',
          'text-ink',
          'transition-colors',
          'placeholder:text-caption',
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
