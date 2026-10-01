'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConfirmDialogProps } from '@/types';

/**
 * Replaces the two `window.confirm()` calls. Deleting a member also deletes
 * every gift idea on that member's list, and deleting a gift idea takes it off
 * the shared list for everyone - the two highest-stakes moments in the app were
 * the two that opened unstyleable OS chrome. The dialog primitive is already
 * here; this only decides what sits in it.
 *
 * The title asks the question and the description states the consequence, so the
 * two never say the same thing twice. Nothing is destroyed until the confirm
 * button is pressed, and the cancel button is the one that gets focus and the
 * one that holds focus by default.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
}) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className='sm:max-w-md xs:h-auto xs:w-auto' hideClose>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className='mt-4'>
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          data-testid='confirmCancel'
          autoFocus
        >
          {cancelLabel}
        </Button>
        <Button
          type='button'
          variant='destructive'
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={cn('sm:ml-2')}
          data-testid='confirmAction'
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ConfirmDialog;
