"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { PlusCircle, Trash2, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";
import { MemberGiftsTranslations, type Gift, type MemberGiftsDialogProps } from "@/types";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

// Memoize the GiftCard component
const GiftCard = memo(function GiftCard({
  gift,
  dict,
  onDelete,
  onTogglePurchased,
  animatedGiftId
}: {
  gift: Gift;
  dict: MemberGiftsTranslations;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  animatedGiftId: string | null;
}) {
  // Debounce the delete handler
  const debouncedDelete = useDebounce((id: string) => {
    onDelete(id);
  }, 300);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debouncedDelete(gift.id);
  }, [gift.id, debouncedDelete]);

  const handleTogglePurchased = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTogglePurchased(gift.id);
  }, [gift.id, onTogglePurchased]);

  const handleGiftClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!gift.isPurchased && gift.url && typeof window !== 'undefined') {
      window.open(gift.url, '_blank');
    }
  }, [gift.isPurchased, gift.url]);

  return (
    <div className={cn(
      "flex",
      "flex-col",
      "rounded-lg",
      "border",
      "bg-card",
      "relative"
    )}>
      {/* Gift details */}
      {gift.description && (
        <a
          href={gift.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleGiftClick}
          className={cn(
            "p-4 pb-2 mt-1",
            "border-b",
            "block"
          )}
        >
          <div className={cn(
            "flex",
            "flex-row"
          )}>
            <div className="flex-1">
              <h3 className={cn(
                "font-medium",
                gift.isPurchased ? 'line-through text-gray-200' : ''
              )}>
                {gift.title}
              </h3>
              <p className={cn(
                "text-sm",
                gift.isPurchased ? 'line-through text-gray-200' : 'text-muted-foreground'
              )}>
                {gift.description}
              </p>
            </div>
            <div className="flex-none">
              {gift.isPurchased ? (
                <CheckCircle className={cn(
                  "inline-block",
                  "mr-2",
                  "text-green-500"
                )} />
              ) : (
                <Circle className={cn(
                  "inline-block",
                  "mr-2",
                  "text-gray-500",
                  animatedGiftId === gift.id ? 'animate-fade-in' : ''
                )} />
              )}
            </div>
          </div>
        </a>
      )}

      {/* Control area */}
      <div className={cn(
        "flex",
        "flex-row",
        "space-x-2"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className={cn(
            "flex-1",
            "text-red-600",
            "hover:text-red-700",
            "border-r",
            "rounded-none"
          )}
        >
          <Trash2 className={cn(
            "h-4",
            "w-4"
          )} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTogglePurchased}
          className={cn(
            "flex-1",
            "transition-transform",
            "duration-300",
            "ease-in-out",
            "rounded-none"
          )}
        >
          {gift.isPurchased ? dict.markAsAvailable : dict.markAsPurchased}
        </Button>
      </div>
    </div>
  );
});

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

  // Reset form state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddGiftForm(false);
      setIsLoading(false);
      setAnimatedGiftId(null);
    }
  }, [isOpen]);

  // Optimize API handlers with useCallback
  const handleAddGift = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const giftData: Omit<Gift, 'id' | 'createdAt'> = {
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
