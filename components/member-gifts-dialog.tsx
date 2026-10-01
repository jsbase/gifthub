'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import GiftCard from '@/components/gift-card';
import ConfirmDialog from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import type { MemberGiftsDialogProps, Gift } from '@/types';

const MemberGiftsDialog: React.FC<MemberGiftsDialogProps> = ({
  isOpen,
  onClose,
  memberId,
  memberName,
  gifts,
  onGiftAdded,
  dict,
}) => {
  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  /* The row whose toggle is in flight, and the row that actually changed. They
     are separate because the strike is a one-shot: gating it on the request
     alone would either replay on every dialog open or never fire. */
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [changedId, setChangedId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Gift | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowAddGiftForm(false);
      setIsLoading(false);
      setTogglingId(null);
      setChangedId(null);
      setPendingDeletion(null);
    }
  }, [isOpen]);

  const handleAddGift = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);

      const formData = new FormData(e.currentTarget);
      const giftData: Omit<Gift, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        url: formData.get('url') as string,
        isPurchased: false,
        groupId: '',
        forMemberId: memberId,
      };

      try {
        const response = await fetch('/api/gifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(giftData),
        });

        if (!response.ok) throw new Error('Failed to add gift');

        toast.success(dict?.toasts.giftAdded);
        setShowAddGiftForm(false);
        onGiftAdded();
        (e.target as HTMLFormElement).reset();
      } catch {
        toast.error(dict?.toasts.giftAddFailed);
      } finally {
        setIsLoading(false);
      }
    },
    [dict?.toasts.giftAdded, dict?.toasts.giftAddFailed, memberId, onGiftAdded]
  );

  const handleTogglePurchased = useCallback(
    async (giftId: string) => {
      try {
        setTogglingId(giftId);
        const response = await fetch(`/api/gifts/${giftId}/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: giftId }),
        });

        if (!response.ok) throw new Error('Failed to update gift status');

        const data = await response.json();
        toast.success(
          data.isPurchased
            ? dict?.toasts.giftStatusPurchased
            : dict?.toasts.giftStatusBackToList
        );
        setChangedId(giftId);
        onGiftAdded();
      } catch (error) {
        toast.error(dict?.toasts.giftStatusUpdateFailed);
      } finally {
        setTogglingId(null);
      }
    },
    [
      dict?.toasts.giftStatusPurchased,
      dict?.toasts.giftStatusBackToList,
      dict?.toasts.giftStatusUpdateFailed,
      onGiftAdded,
    ]
  );

  const handleDeleteGift = useCallback(
    async (giftId: string) => {
      try {
        const response = await fetch(`/api/gifts/${giftId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete gift');
        }

        toast.success(dict?.toasts.giftDeleted);
        onGiftAdded();
      } catch (error) {
        toast.error(dict?.toasts.giftDeleteFailed);
      }
    },
    [
      dict?.toasts.giftDeleted,
      dict?.toasts.giftDeleteFailed,
      onGiftAdded,
    ]
  );

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeletion) {
      handleDeleteGift(pendingDeletion.id);
    }
  }, [pendingDeletion, handleDeleteGift]);

  if (!mounted) {
    return null;
  }

  const isFullScreen = gifts.length > 5;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        closeLabel={dict.close}
        className={cn(
          'max-w-dialog',
          'xs:p-dialog-pad-mobile',
          'xs:h-[85vh]',
          'xs:max-h-[85vh]',
          isFullScreen ? 'xs:w-full xs:h-full' : 'xs:w-auto xs:h-auto'
        )}
      >
        <DialogHeader>
          {/*
            The one dialog title that is a name, so the one dialog title in the
            serif. A person's name is the content the serif is reserved for.
          */}
          <DialogTitle className='font-serif xs:text-2xl'>{memberName}</DialogTitle>
          <DialogDescription>{dict.listHint}</DialogDescription>
        </DialogHeader>

        <div
          className={cn('mt-2', 'space-y-dialog-desktop', 'xs:space-y-dialog-mobile')}
        >
          {!showAddGiftForm && (
            <>
              <Button
                onClick={() => setShowAddGiftForm(true)}
                className={cn('w-full', 'sm:w-fit')}
                data-testid='addGiftButton'
              >
                <PlusCircle className={cn('h-4', 'w-4')} />
                {dict.addGift}
              </Button>

              {gifts.length > 0 ? (
                <ul className='-mx-2 sm:-mx-3'>
                  {gifts.map((gift) => (
                    <GiftCard
                      key={gift.id}
                      gift={gift}
                      dict={dict}
                      onDelete={(id) =>
                        setPendingDeletion(
                          gifts.find((candidate) => candidate.id === id) ?? null
                        )
                      }
                      onTogglePurchased={handleTogglePurchased}
                      togglingId={togglingId}
                      changedId={changedId}
                    />
                  ))}
                </ul>
              ) : (
                <p
                  className={cn(
                    'max-w-[40ch]',
                    'pt-6',
                    'text-[0.9375rem]',
                    'leading-relaxed',
                    'text-muted-foreground',
                    'xs:text-sm'
                  )}
                >
                  {dict.noGifts}
                </p>
              )}
            </>
          )}

          {showAddGiftForm && (
            <form
              onSubmit={handleAddGift}
              className={cn('space-y-4', 'xs:space-y-3')}
            >
              <div className={cn('space-y-2', 'xs:space-y-1')}>
                <Label htmlFor='title' className='sr-only'>
                  {dict.enterGiftTitle}
                </Label>
                <Input
                  id='title'
                  name='title'
                  placeholder={dict.enterGiftTitle}
                  required
                />
              </div>

              <div className={cn('space-y-2', 'xs:space-y-1')}>
                <Label className='sr-only' htmlFor='description'>
                  {dict.enterDescription}
                </Label>
                <Textarea
                  id='description'
                  name='description'
                  placeholder={`${dict.enterDescription} (${dict.optional})`}
                  rows={3}
                />
              </div>

              <div className={cn('space-y-2', 'xs:space-y-1')}>
                <Label className='sr-only' htmlFor='url'>
                  {dict.enterUrl}
                </Label>
                <Input
                  id='url'
                  name='url'
                  type='url'
                  placeholder={`${dict.enterUrl} (${dict.optional})`}
                />
              </div>

              <div
                className={cn(
                  'flex',
                  'flex-row',
                  'space-x-2',
                  'xs:flex-col',
                  'xs:space-x-0',
                  'xs:space-y-2'
                )}
              >
                <Button
                  type='submit'
                  disabled={isLoading}
                  className={cn('xs:w-full', 'xs:text-sm')}
                  data-testid='addGiftSubmit'
                >
                  {isLoading ? dict.adding : dict.addGift}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowAddGiftForm(false)}
                  className={cn('xs:w-full', 'xs:text-sm')}
                >
                  {dict.cancel}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>

      <ConfirmDialog
        isOpen={pendingDeletion !== null}
        onClose={() => setPendingDeletion(null)}
        onConfirm={handleConfirmDelete}
        title={dict.deleteGiftConfirm}
        description={dict.confirmations.deleteGift}
        confirmLabel={dict.deleteGift}
        cancelLabel={dict.cancel}
      />
    </Dialog>
  );
};

export default MemberGiftsDialog;
