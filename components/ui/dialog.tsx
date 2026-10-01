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
      'bg-foreground/45',
      'backdrop-blur-[2px]',
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

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50',
        'flex flex-col',
        'w-full',
        'gap-2',
        'border',
        'border-border',
        'bg-surface',
        'text-foreground',
        'p-6',
        // The one shadow in the app: a dialog has to separate from its scrim,
        // and this is a long soft falloff rather than the generic card shadow.
        'shadow-[0_18px_50px_-12px_rgb(0_0_0/0.28)]',
        'duration-200',
        'overflow-y-auto',
        'overflow-x-hidden',
        // Below sm the dialog becomes a full-height sheet, squared off at the
        // top, sitting directly under the header.
        'xs:h-[calc(100dvh-var(--header-height)-1px)]',
        'xs:w-screen',
        'xs:gap-2',
        'xs:p-4',
        'xs:top-[calc(var(--header-height)+1px)]',
        'xs:bottom-0',
        'xs:left-0',
        'xs:right-0',
        'xs:rounded-none',
        'xs:translate-x-0',
        'xs:data-[state=closed]:slide-out-to-bottom',
        'xs:data-[state=open]:slide-in-from-bottom',
        'xs:mb-4',
        'sm:h-fit',
        'sm:max-h-[85vh]',
        'sm:max-w-lg',
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
      {children}
      <DialogPrimitive.Close
        className={cn(
          'absolute',
          'right-4',
          'top-4',
          'rounded-md',
          'p-1.5',
          'text-muted-foreground',
          'transition-colors',
          'hover:bg-accent',
          'hover:text-foreground',
          'data-[state=open]:bg-accent',
          'data-[state=open]:text-muted-foreground'
        )}
        data-testid='dialogClose'
      >
        <X className='h-4 w-4' />
        <span className='sr-only'>Close</span>
      </DialogPrimitive.Close>
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
      'space-y-1.5',
      'text-left',
      'xs:space-y-1',
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
      'sm:flex-row',
      'sm:justify-end',
      'sm:space-x-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

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
      'pr-8',
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
    className={cn('text-[0.9375rem]', 'text-muted-foreground', className)}
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
