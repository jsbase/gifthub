'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GiftCard } from '@/components/gift-card';
import type { MemberGiftsDialogProps, Gift } from '@/types';

export default function MemberGiftsDialog({
  isOpen,
  onClose,
  memberId,
  memberName,
  gifts,
  onGiftAdded,
  dict
}: MemberGiftsDialogProps) {
  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [animatedGiftId, setAnimatedGiftId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowAddGiftForm(false);
      setIsLoading(false);
      setAnimatedGiftId(null);
    }
  }, [isOpen]);

  const handleAddGift = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const giftData: Omit<Gift, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      url: formData.get('url') as string,
      isPurchased: false,
      groupId: "",
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
  }, [dict?.toasts.giftAdded, dict?.toasts.giftAddFailed, memberId, onGiftAdded]);

  const handleTogglePurchased = useCallback(async (giftId: string) => {
    try {
      setAnimatedGiftId(giftId);
      const response = await fetch(`/api/gifts/${giftId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: giftId }),
      });

      if (!response.ok) throw new Error('Failed to update gift status');

      const data = await response.json();
      toast.success(data.isPurchased ? dict?.toasts.giftStatusPurchased : dict?.toasts.giftStatusBackToList);
      onGiftAdded();
    } catch (error) {
      toast.error(dict?.toasts.giftStatusUpdateFailed);
    } finally {
      setAnimatedGiftId(null);
    }
  }, [dict?.toasts.giftStatusPurchased, dict?.toasts.giftStatusBackToList, dict?.toasts.giftStatusUpdateFailed, onGiftAdded]);

  const handleDeleteGift = useCallback(async (giftId: string) => {
    if (!confirm(dict?.confirmations.deleteGift)) {
      return;
    }

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
  }, [dict?.confirmations.deleteGift, dict?.toasts.giftDeleted, dict?.toasts.giftDeleteFailed, onGiftAdded]);

  if (!mounted) {
    return null;
  }

  const isFullScreen = gifts.length > 5;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-dialog",
        "xs:p-dialog-mobile",
        "xs:h-[85vh]",
        "xs:max-h-[85vh]",
        isFullScreen ? "xs:w-full xs:h-full" : "xs:w-auto xs:h-auto"
      )}>
        <DialogHeader>
          <DialogTitle className="xs:text-base">
            {dict.title} {memberName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {dict.manageGifts}
          </DialogDescription>
        </DialogHeader>

        <div className={cn(
          "space-y-dialog-desktop",
          "xs:space-y-dialog-mobile"
        )}>
          {!showAddGiftForm && (
            <>
              <Button
                onClick={() => setShowAddGiftForm(true)}
                className={cn(
                  "w-full",
                  "my-4"
                )}
                data-testid="addGiftButton"
              >
                <PlusCircle className={cn(
                  "h-4",
                  "w-4",
                  "mr-2"
                )} />
                {dict.addGift}
              </Button>

              {gifts.length > 0 ? (
                <div className="space-y-4">
                  {gifts.map((gift) => (
                    <GiftCard
                      key={gift.id}
                      gift={gift}
                      dict={dict}
                      onDelete={handleDeleteGift}
                      onTogglePurchased={handleTogglePurchased}
                      animatedGiftId={animatedGiftId}
                    />
                  ))}
                </div>
              ) : (
                <p className={cn(
                  "text-center",
                  "text-muted-foreground",
                  "xs:text-sm"
                )}>
                  {dict.noGifts}
                </p>
              )}
            </>
          )}

          {showAddGiftForm && (
            <form onSubmit={handleAddGift} className={cn(
              "space-y-4",
              "xs:space-y-3"
            )}>
              <div className={cn(
                "space-y-2",
                "xs:space-y-1"
              )}>
                <Label htmlFor="title" className="sr-only">
                  {dict.enterGiftTitle}
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={dict.enterGiftTitle}
                  required
                />
              </div>

              <div className={cn(
                "space-y-2",
                "xs:space-y-1"
              )}>
                <Label className="sr-only" htmlFor="description">
                  {dict.enterDescription}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder={`${dict.enterDescription} (${dict.optional})`}
                  rows={3}
                />
              </div>

              <div className={cn(
                "space-y-2",
                "xs:space-y-1"
              )}>
                <Label className="sr-only" htmlFor="url">
                  {dict.enterUrl}
                </Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder={`${dict.enterUrl} (${dict.optional})`}
                />
              </div>

              <div className={cn(
                "flex",
                "flex-row",
                "space-x-2",
                "xs:flex-col",
                "xs:space-x-0",
                "xs:space-y-2"
              )}>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "xs:w-full",
                    "xs:text-sm"
                  )}
                  data-testid="addGiftSubmit"
                >
                  {isLoading ? dict.adding : dict.addGift}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddGiftForm(false)}
                  className={cn(
                    "xs:w-full",
                    "xs:text-sm"
                  )}
                >
                  {dict.cancel}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
