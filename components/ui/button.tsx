import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * A printed control, not a moulded one.
 *
 * Album stock and label stock are trimmed with a blade, so every control here
 * is cut square-ish (3px) and nothing is pill-shaped, haloed or lifted. The
 * only thing that changes on hover is the amount of ink on the sheet: a solid
 * ink block lightens by a tenth, and a transparent one takes a 7% wash. There
 * is no lift, no scale and no shadow, because a printed page does not have a
 * z-axis.
 *
 * Focus is not handled here. One mechanism in `@layer base` covers every
 * focusable element in the app, so a new control cannot be added without
 * inheriting a visible keyboard focus and there is no second ring to keep in
 * sync with this one.
 *
 * Every size is 44px or taller except `lg`, which is 48px. That is not a
 * preference: this app is used one-handed on a phone by someone in a hurry, and
 * the previous system's 40px `default` and 36px `icon` sat below that floor on
 * the two controls that matter most on a sheet - marking an idea collected and
 * deleting one.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        // Solid ink: the loudest thing in a group, and it should be the one
        // action a sheet exists to perform.
        default: 'bg-ink text-ink-foreground hover:bg-ink/88',
        // A red pencil, not a red field. Ink on label is already unreadable, so
        // destructive colour is the caption weight pushed to red.
        destructive:
          'bg-destructive text-ink-foreground hover:bg-destructive/88',
        // A printed rule around nothing. This is the secondary action.
        outline: 'border border-rule bg-transparent text-ink hover:bg-wash',
        // Caption weight with no edge at all: the quiet way to offer an action.
        ghost: 'text-caption hover:bg-wash hover:text-ink',
        link: 'text-ink underline decoration-rule underline-offset-4 hover:decoration-ink',
      },
      size: {
        default: 'h-11 px-4 text-[0.9375rem]',
        // Same height as `default`, tighter in the hand: a smaller control here
        // would be a target below the 44px floor, so `sm` is a density change
        // and not a size change.
        sm: 'h-11 px-3 text-[0.875rem]',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
