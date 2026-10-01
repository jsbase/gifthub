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
}) => {
  return (
    <DialogContent
      className={cn(
        'max-w-dialog',
        'xs:p-dialog-pad-mobile p-dialog-pad-desktop',
        className
      )}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className='pr-6'>
          {description}
        </DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
};

export default AuthDialog;
