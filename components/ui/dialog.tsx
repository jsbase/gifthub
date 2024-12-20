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
      'bg-black/80',
      'data-[state=open]:animate-in',
      'data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0',
      'data-[state=open]:fade-in-0',
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
        'bg-background',
        'p-6',
        'shadow-lg',
        'duration-200',
        'overflow-y-auto',
        'overflow-x-hidden',
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
          'rounded-sm',
          'opacity-70',
          'ring-offset-background',
          'transition-opacity',
          'hover:opacity-100',
          'focus:outline-none',
          'focus:ring-2',
          'focus:ring-ring',
          'focus:ring-offset-2',
          'disabled:pointer-events-none',
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

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex',
      'flex-col',
      'space-y-1.5',
      'text-center',
      'xs:space-y-1',
      'xs:pt-0 sm:pt-0',
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
      'text-lg',
      'font-semibold',
      'leading-none',
      'tracking-tight',
      'xs:max-w-[95%]',
      'max-w-[98%]',
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
    className={cn('text-sm', 'text-muted-foreground', className)}
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
