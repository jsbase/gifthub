'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconX } from '@tabler/icons-react';
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
 *
 * They are positioned for the padding they sit in. A mark is 8px wide, so
 * `left-3` puts its outer edge at 20px and its inner edge at 12px: against the
 * dialog's `p-5` that ends exactly where the content starts, and against
 * `xs:p-4` it ran 4px over the first cell. Hence `xs:left-2` and its siblings -
 * the marks belong in the margin, never on top of what is printed.
 *
 * They are also `pointer-events-none` and must stay that way. A mark that
 * cannot be tapped is furniture; a mark that eats a tap is a bug.
 */
export const CropMarks = () => (
  <>
    {(
      [
        ['top-3 left-3 xs:top-2 xs:left-2', 'border-l border-t'],
        ['top-3 right-3 xs:top-2 xs:right-2', 'border-r border-t'],
        ['bottom-3 left-3 xs:bottom-2 xs:left-2', 'border-l border-b'],
        ['bottom-3 right-3 xs:bottom-2 xs:right-2', 'border-r border-b'],
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
        'border',
        'border-rule',
        'bg-sheet',
        'text-ink',
        // The only shadow in the app: a sheet genuinely floats above the board,
        // and this is a long soft falloff rather than a generic card shadow.
        'shadow-[0_22px_60px_-16px_rgb(0_0_0/0.34)]',
        'duration-200',
        // The sheet is the FRAME. The padding and the scrolling live on the
        // inner element below, and this box does not scroll - so the crop marks
        // and the close button, which are positioned against this box, stay put.
        //
        // They did not used to. `absolute` children of a scroll container scroll
        // with its content, so `overflow-y-auto` on this box took the bottom two
        // marks up into the middle of the gift list and the X up with them. The
        // furniture on a sheet of label stock is fixed to the paper, not printed
        // on whatever happens to be showing.
        'overflow-hidden',
        // Below sm the sheet becomes the whole page below the header, squared at
        // the top: a sheet pulled out of an album, not a card floating on one.
        //
        // It is anchored at the TOP EDGE ONLY. Anchoring both vertical edges and
        // then letting callers ask for `xs:h-auto` was the trap this replaced: a
        // fixed box with a definite top and a definite bottom resolves
        // `height: auto` to the gap between them, so the caller's height could
        // not bind, the sheet stood the full height of the remaining page, and
        // the override that was supposed to release it had to be repeated in
        // every caller to get one rule to work. A caller that wants a different
        // cap says so once, and nothing has to release an edge that is no
        // longer there.
        //
        // The floor and the cap are the SAME measure, so a sheet on a phone is
        // always exactly the page below the header: a short one is padded out to
        // it with blank label stock, a long one scrolls. It used to hug its
        // contents up to the cap instead, and on a 375x667 screen that meant a
        // three-row members sheet ending in the middle of the fold with the
        // last row cut in half - a sheet that looks like the page was truncated
        // rather than like a page you can scroll. A bottom edge that can land
        // anywhere on the screen is not an edge at all; on a phone the sheet is
        // the page, so its foot is the foot of the screen.
        //
        // `-1px`, not a gap. The cap used to leave the foot 15px clear of the
        // viewport, which was right for a sheet that floated over the board and
        // is wrong for one that IS the page: it put a 15px strip of scrim
        // between the paper and the bottom of the screen, which is the one cue
        // that reads as a card. The `-1px` is the header's own `border-b`, and it
        // mirrors `xs:top-*` above, so the sheet runs from the header's rule to
        // the bottom edge with nothing of the board left showing.
        'xs:min-h-[calc(100dvh-var(--header-height)-1px)]',
        'xs:max-h-[calc(100dvh-var(--header-height)-1px)]',
        'xs:top-[calc(var(--header-height)+1px)]',
        'xs:w-screen',
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
      {/*
        The scrolling half of the sheet: padding, the stack gap, and the close
        control - everything that belongs to the content rather than to the frame.

        `min-h-0` is load-bearing. A flex item defaults to `min-height: auto`,
        which refuses to shrink below its content, so the inner box would push
        past `xs:max-h-*` / `sm:max-h-[85dvh]` and this would not scroll at all
        - it would just overflow the sheet and be clipped by the frame. Zeroing
        the automatic minimum is what lets the parent's cap bind.

        `grow` is what makes the floor above legible from the inside. Growth
        keeps `flex-basis: auto`, so at `sm` and up, where the frame has no
        minimum, the box is still exactly its content and nothing moves; below
        `sm` the frame's `min-h` opens up space the content does not fill, and
        this fills it. That is what lets a caller's `xs:mt-auto` foot - the two
        choices of a destructive confirmation - drop to the bottom of the sheet
        into the thumb zone, instead of sitting 500px above the bottom edge with
        a screenful of blank stock under it. `flex-1` would have been wrong here:
        its `0%` basis makes the frame's auto height resolve to zero above `sm`.
      */}
      <div
        className={cn(
          // `relative` is what makes the close control belong to the content
          // instead of to the frame. Without it, `absolute` resolves against
          // this component's own `relative` root, so the X stayed pinned over
          // the scrolling list and sat on top of a gift's delete button in nine
          // of eleven scroll positions - a tap meant to delete closed the sheet
          // instead. Positioned here, it scrolls away with the text it belongs
          // to, which is also how it behaved before.
          'relative',
          'flex grow min-h-0 flex-col gap-5 overflow-y-auto',
          'overflow-x-hidden',
          'p-5 xs:gap-4 xs:p-4'
        )}
      >
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
            <IconX className='h-4 w-4' />
            <span className='sr-only'>{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </div>
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
