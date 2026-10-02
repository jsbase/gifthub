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
    {/*
      The width is the caller's to set, and the mobile box is not. This used to
      carry `xs:h-auto xs:w-auto` as well, and both were inoperative: the
      primitive anchored the sheet with a definite top and bottom, so `h-auto`
      resolved to the gap between them and the two buttons sat above a void that
      filled the rest of the phone, and `w-auto` lost to the primitive's
      `xs:left-0 xs:right-0`. The primitive now owns the mobile geometry, so
      there is nothing here to override - and no way for the next caller to
      reintroduce the same two dead classes.

      The one thing that IS this dialog's to decide is where its two choices
      sit. The primitive now stands every sheet on a phone at the full height
      below the header, which for a two-choice prompt is a screenful of stock
      holding one question - so `xs:mt-auto` drops the pair to the foot of the
      sheet, into the thumb zone, with the question left at the head. That is
      the one place in this app where a control is deliberately far from the text
      it belongs to, and it earns it: on a phone the hand is at the bottom, and
      the cheapest thing to get right in a dialog you cannot back out of is
      where the button is. Above `sm` the sheet hugs its contents and the margin
      resolves to the same 16px as before.
    */}
    <DialogContent className='sm:max-w-md' hideClose>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className='mt-4 xs:mt-auto'>
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
