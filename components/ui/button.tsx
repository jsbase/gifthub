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
 * **A glyph in a control cannot be squeezed, and that is declared once here
 * rather than on every call site.** `[&_svg]:shrink-0` is the only rule that
 * makes the size a control's icon was written at actually hold: a flex item's
 * default is `flex-shrink: 1`, every button here is `whitespace-nowrap`, and a
 * nowrap label does not wrap - so when a row runs out of room the label refuses
 * to give and the icon is the only thing left that can.
 *
 * Nothing shrinks today, which is exactly why it survived review: the labels as
 * written fit. But a flex item is sized against what is left over, so a longer
 * German or Russian label, a larger OS text size, or a longer list name is enough
 * to take a 16px glyph to 9px and distort its stroke weight with it, and the
 * symptom arrives as one odd row rather than as an error. Measured across the
 * contents page at 320px and 390px in both de and ru, thirteen controls - the
 * create button and all four owner actions on every row - carried their icon at
 * `flex-shrink: 1` and held 16px only because there happened to be enough room.
 * Meanwhile the header, the language switcher, the logo, the account picker, the
 * address glyph on a cell and two of the groups sheet's own add rows each wrote
 * `shrink-0` by hand, so the convention existed and was simply not the
 * primitive's. It is now, and one rule covers every control added later.
 *
 * Every size is 44px or taller except `lg`, which is 48px. That is not a
 * preference: this app is used one-handed on a phone by someone in a hurry, and
 * the previous system's 40px `default` and 36px `icon` sat below that floor on
 * the two controls that matter most on a sheet - marking an idea collected and
 * deleting one.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
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
        /*
          The action of a sheet, and the reason it is its own size rather than
          `default` written over.

          Below `sm` a sheet IS the page under the header, so the control a thumb
          is reaching for gets the 48px floor rather than the app-wide 44 - which
          is what `login-form.tsx` documents and what seven call sites each
          restated as `cn('...', 'xs:h-12', 'xs:text-base')`. Restated is the
          problem: the primary carried the phone height and the cancel beside it
          did not, so every two-button footer in the product drew a 48px button
          against a 44px one. Measured at 390px, the groups sheet's pair measured
          44px and 48px side by side; at 1280px, 44px and 44px. `xs:text-base`
          goes with the height for the same reason - at 390px the sheet is the
          whole screen, so the action it exists to perform is set at body size
          rather than at label size - and a cancel at 15px beside a primary at
          16px is the same mismatch one step smaller.

          One variant, so the pair cannot disagree: whichever button is the
          primary and whichever is the way out, both say `size='cta'` and the
          height is decided here.
         */
        cta: 'h-11 px-4 text-[0.9375rem] xs:h-12 xs:text-base',
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
