"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { PlusCircle, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { MemberGiftsDialogProps } from "@/types";

export function MemberGiftsDialog({
  isOpen,
  onClose,
  memberEmail,
  memberId,
  gifts,
  onGiftAdded,
  dict
}: MemberGiftsDialogProps) {
  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddGift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const giftData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      url: formData.get('url') as string,
      forMemberId: memberId,
    };

    try {
      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giftData),
      });

      if (!response.ok) {
        throw new Error('Failed to add gift');
      }

      toast.success(dict.toasts.giftAdded);
      setShowAddGiftForm(false);
      onGiftAdded();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error(dict.toasts.giftAddFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePurchased = async (giftId: string) => {
    try {
      const response = await fetch(`/api/gifts/${giftId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: giftId }),
      });

      if (!response.ok) {
        throw new Error('Failed to update gift status');
      }

      toast.success(dict.toasts.giftStatusUpdated);
      onGiftAdded(); // Refresh the list
    } catch (error) {
      toast.error(dict.toasts.giftStatusUpdateFailed);
    }
  };

  const handleDeleteGift = async (giftId: string) => {
    if (!confirm(dict.confirmations.deleteGift)) {
      return;
    }

    try {
      const response = await fetch(`/api/gifts/${giftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete gift');
      }

      toast.success(dict.toasts.giftDeleted);
      onGiftAdded(); // Refresh the list
    } catch (error) {
      toast.error(dict.toasts.giftDeleteFailed);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="xs:text-base">
            {dict.title} {memberEmail}
          </DialogTitle>
          <DialogDescription>
            {dict.manageGifts}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 xs:space-y-2">
          {!showAddGiftForm && (
            <>
              <Button
                onClick={() => setShowAddGiftForm(true)}
                className="w-full"
                variant="outline"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                {dict.addGift}
              </Button>

              {gifts.length > 0 ? (
                <div className="space-y-3 xs:space-y-2">
                  {[...gifts]
                    .sort((a, b) => Number(a.isPurchased) - Number(b.isPurchased))
                    .map((gift) => (
                      <div
                        key={gift.id}
                        className={`p-4 xs:p-3 rounded-lg border bg-card ${gift.isPurchased ? 'opacity-60' : ''} relative`}
                      >
                        <a
                          href={gift.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => (!gift.url || gift.isPurchased) && e.preventDefault()}
                          className={`absolute inset-0 ${gift.url && !gift.isPurchased ? 'cursor-pointer' : 'cursor-default'}`}
                        />
                        <div className="flex items-center justify-between relative z-10 pointer-events-none">
                          <div className="flex-grow">
                            <h3 className={`font-medium ${gift.isPurchased ? 'line-through' : ''}`}>
                              {gift.title}
                            </h3>
                            {gift.description && (
                              <p className={`text-sm text-muted-foreground mt-1 ${gift.isPurchased ? 'line-through' : ''}`}>
                                {gift.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 pointer-events-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleTogglePurchased(gift.id);
                              }}
                              className={`relative z-10 ${gift.isPurchased ? "text-green-600" : ""}`}
                            >
                              {gift.isPurchased ? (
                                <X className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteGift(gift.id);
                              }}
                              className="relative z-10 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground xs:text-sm">
                  {dict.noGifts}
                </p>
              )}
            </>
          )}

          {showAddGiftForm && (
            <form onSubmit={handleAddGift} className="space-y-4 xs:space-y-3">
              <div className="space-y-2 xs:space-y-1">
                <Label htmlFor="title" className="xs:text-sm"></Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={dict.enterGiftTitle}
                  required
                  className="xs:text-sm"
                />
              </div>

              <div className="space-y-2 xs:space-y-1">
                <Label htmlFor="description" className="xs:text-sm"></Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder={`${dict.enterDescription} (${dict.optional})`}
                  className="xs:text-sm"
                  rows={3}
                />
              </div>

              <div className="space-y-2 xs:space-y-1">
                <Label htmlFor="url" className="xs:text-sm"></Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder={`${dict.enterUrl} (${dict.optional})`}
                  className="xs:text-sm"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddGiftForm(false)}
                  className="xs:text-sm"
                >
                  {dict.cancel}
                </Button>
                <Button type="submit" disabled={isLoading} className="xs:text-sm">
                  {isLoading ? dict.adding : dict.addGift}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
