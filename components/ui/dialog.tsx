'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0',
      'z-50',
      // A scrim, not a glass panel. The board behind stays legible and recedes;
      // nothing here blurs, because nothing in a printed world does.
      'bg-scrim/55',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0',
      'data-[state=open]:fade-in-0',
      'duration-200',
      className
    )}
    data-testid='dialog-overlay'
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * A sheet of label stock laid on the board.
 *
 * Four printers' crop marks sit in the corners at low contrast. They cost four
 * absolutely positioned elements and they are the single detail that tells you
 * this is a printed page rather than a card - which is the difference this whole
 * world is making.
 */
export const CropMarks = () => (
  <>
    {(
      [
        ['top-3 left-3', 'border-l border-t'],
        ['top-3 right-3', 'border-r border-t'],
        ['bottom-3 left-3', 'border-l border-b'],
        ['bottom-3 right-3', 'border-r border-b'],
      ] as const
    ).map(([position, edges]) => (
      <span
        key={position}
        aria-hidden='true'
        className={cn(
          'pointer-events-none absolute h-2 w-2 border-furniture opacity-70',
          position,
          edges
        )}
      />
    ))}
  </>
);

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** Accessible name for the close control; callers pass a translated one. */
    closeLabel?: string;
    /**
     * A destructive confirmation is a two-choice dialog, and the X is a third,
     * ambiguous way out of a prompt about deleting something. Cancel is the way
     * to back out, so the close control is left out - which also keeps
     * `dialogClose` unique in the DOM while one dialog is exiting.
     */
    hideClose?: boolean;
  }
>(({ className, children, closeLabel = 'Close', hideClose, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50',
        'flex flex-col',
        'w-full',
        'gap-5',
        'border',
        'border-rule',
        'bg-sheet',
        'text-ink',
        'p-5 xs:p-4',
        // The only shadow in the app: a sheet genuinely floats above the board,
        // and this is a long soft falloff rather than a generic card shadow.
        'shadow-[0_22px_60px_-16px_rgb(0_0_0/0.34)]',
        'duration-200',
        'overflow-y-auto',
        'overflow-x-hidden',
        // Below sm the sheet becomes the whole page below the header, squared at
        // the top: a sheet pulled out of an album, not a card floating on one.
        //
        // It is anchored at the TOP EDGE ONLY. Anchoring both vertical edges and
        // then letting callers ask for `xs:h-auto` was the trap this replaced: a
        // fixed box with a definite top and a definite bottom resolves
        // `height: auto` to the gap between them, so the caller's height could
        // not bind, the sheet stood the full height of the remaining page, and
        // the override that was supposed to release it had to be repeated in
        // every caller to get one rule to work. Here the sheet is as tall as
        // what is written on it, up to a cap that keeps its bottom edge 15px
        // clear of the viewport, and it scrolls once it hits the cap. A caller
        // that wants a different cap says so once, and nothing has to release an
        // edge that is no longer there.
        'xs:h-auto',
        'xs:max-h-[calc(100dvh-var(--header-height)-1rem)]',
        'xs:top-[calc(var(--header-height)+1px)]',
        'xs:w-screen',
        'xs:gap-4',
        'xs:left-0',
        'xs:right-0',
        'xs:rounded-none',
        'xs:translate-x-0',
        'xs:data-[state=closed]:slide-out-to-bottom',
        'xs:data-[state=open]:slide-in-from-bottom',
        'sm:h-fit',
        'sm:max-h-[85dvh]',
        // A sheet of label stock is 32rem unless a caller says otherwise. This
        // default used to be `sm:max-w-lg` written here *and* `max-w-sheet`
        // passed by the caller, and because the two are different Tailwind
        // modifier groups the base one silently won at every width above 640px -
        // the wide sheet token was dead code and every wide dialog rendered at
        // 512px. Both are now the same `sm:max-w-*` modifier, which is half the
        // fix: `twMerge` still keeps BOTH classes (`sm:max-w-[32rem]
        // sm:max-w-sheet` survives it), and the caller's wins because Tailwind
        // emits the arbitrary-value rule after the named one. Verified, not
        // assumed - which is why this default is expressed as the value rather
        // than left to fight it. A caller passing a standard scale size
        // (`sm:max-w-md`) does get merged down to just its own class.
        'sm:max-w-[32rem]',
        'sm:rounded-lg',
        'sm:left-[50%] sm:translate-x-[-50%]',
        'sm:top-[50%] sm:translate-y-[-50%]',
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0',
        'data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    >
      <CropMarks />
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            'absolute',
            'right-3',
            'top-3',
            'grid',
            'h-11',
            'w-11',
            'place-items-center',
            'rounded-md',
            'text-caption',
            'transition-colors',
            'hover:bg-wash',
            'hover:text-ink',
            'data-[state=open]:bg-wash',
            'data-[state=open]:text-ink'
          )}
          data-testid='dialogClose'
        >
          <X className='h-4 w-4' />
          <span className='sr-only'>{closeLabel}</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Left aligned, not centred: a centred title has to be re-found on every line,
// and the only thing in this app worth centring is the loading spinner.
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex',
      'flex-col',
      'gap-1.5',
      'pr-11',
      'text-left',
      'xs:gap-1',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex',
      'flex-col-reverse',
      'gap-2',
      'sm:flex-row',
      'sm:justify-end',
      'xs:gap-1.5',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

// No font family here. The serif in this app is for a name, and whether a
// dialog is titled by a person's name or by a verb is the caller's decision:
// the gifts sheet passes `font-serif` because its title is the member's name,
// the other three do not.
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'font-serif',
      'text-2xl',
      'font-semibold',
      'leading-tight',
      'tracking-[-0.01em]',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-[0.9375rem]', 'text-caption', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
