'use client';

import React from 'react';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AuthDialogProps } from '@/types';

const AuthDialog: React.FC<AuthDialogProps> = ({
  children,
  title,
  description,
  className,
  closeLabel,
}) => {
  return (
    <DialogContent
      closeLabel={closeLabel}
      className={cn('sm:max-w-sheet', className)}
    >
      <DialogHeader>
        {/*
          `font-sans` against the primitive's `font-serif`, deliberately.

          `DialogTitle` sets the serif by default and `components/ui/dialog.tsx`
          leaves the choice to its caller, because "the serif in this app is for
          a name" - and these two sheets are titled by a verb ("Log in",
          "Create an account"), not by a person. The sheets that genuinely are
          titled by a name pass `font-serif` themselves; leaving the default here
          put a serif on a control, which is the one thing `DESIGN.md` says never
          to do with it.
        */}
        <DialogTitle className='font-sans'>{title}</DialogTitle>
        <DialogDescription className='pr-6'>
          {description}
        </DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
};

export default AuthDialog;
