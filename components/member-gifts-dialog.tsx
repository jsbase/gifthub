"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MemberGiftsDialogProps } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useParams } from 'next/navigation';
import type { LanguageCode } from '@/types';

export function MemberGiftsDialog({
  isOpen,
  onClose,
  memberId,
  memberName,
  gifts,
  onGiftAdded,
  dict
}: MemberGiftsDialogProps) {
  const params = useParams();
  const lang = params.lang as LanguageCode;

  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [animatingGifts, setAnimatingGifts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setShowAddGiftForm(false);
    }
  }, [isOpen]);

  // Determine if we should use full height based on gifts count AND form state
  const useFullHeight = gifts.length > 5 && !showAddGiftForm;

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

      const data = await response.json();
      if (data.isPurchased) {
        setAnimatingGifts(prev => new Set(prev).add(giftId));
      }
      toast.success(data.isPurchased ? dict.toasts.giftStatusPurchased : dict.toasts.giftStatusAvailable);
      onGiftAdded();
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
      <DialogContent className={cn(
        "max-w-2xl",
        "xs:p-4",
        "xs:h-[85vh] xs:max-h-[85vh]"
      )}>
        <DialogHeader>
          <DialogTitle className="xs:text-base">
            {dict.title}<br />{memberName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {dict.manageGifts}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 xs:space-y-2">
          {!showAddGiftForm && (
            <>
              <Button
                onClick={() => setShowAddGiftForm(true)}
                className="w-full my-4"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                {dict.addGift}
              </Button>

              {gifts.length > 0 ? (
                <div className="space-y-3 xs:space-y-2">
                  {gifts.map((gift) => (
                    <div
                      key={gift.id}
                      className="p-4 xs:p-3 rounded-lg border bg-card relative"
                    >
                      {gift.isPurchased && (
                        <div className="absolute inset-0 bg-background/80 rounded-lg transition-opacity duration-200" />
                      )}
                      {gift.isPurchased && (
                        <div className={cn(
                          "absolute -top-2 right-[4.3rem] xs:right-[4rem] z-20 w-6 h-6",
                          animatingGifts.has(gift.id) && "animate-slide-in-top"
                        )}>
                          <Image
                            src="/purchased.svg"
                            alt="Purchased"
                            width={24}
                            height={24}
                            className="w-full h-full"
                          />
                        </div>
                      )}
                      <a
                        href={gift.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => (!gift.url || gift.isPurchased) && e.preventDefault()}
                        className={`absolute inset-0 ${gift.url && !gift.isPurchased ? 'cursor-pointer' : 'cursor-default'}`}
                      />
                      <div className="flex items-center justify-between relative z-10">
                        <div className={cn(
                          "flex-grow transition-opacity duration-500",
                          gift.isPurchased ? "opacity-60" : ""
                        )}>
                          <h3 className="font-medium">
                            {gift.title}
                          </h3>
                          {gift.description && (
                            <div className="relative h-[1.5rem]">
                              <p 
                                className={cn(
                                  "text-sm text-muted-foreground mt-1 absolute w-full",
                                  gift.isPurchased 
                                    ? "animate-slide-in-top-small" 
                                    : "opacity-0"
                                )}
                              >
                                {dict.giftStatusAlreadyPurchased}
                              </p>
                              <p 
                                className={cn(
                                  "text-sm text-muted-foreground mt-1 absolute w-full transition-opacity duration-500",
                                  gift.isPurchased 
                                    ? "animate-slide-out-bottom opacity-60" 
                                    : "opacity-100"
                                )}
                              >
                                {gift.description}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 relative z-20">
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
                          <label className="inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={gift.isPurchased}
                              onChange={(e) => {
                                e.preventDefault();
                                handleTogglePurchased(gift.id);
                              }}
                              className="peer sr-only"
                            />
                            <div
                              className={cn(
                                "peer relative h-5 w-9 rounded-full after:absolute after:start-[2px] after:top-[2px]",
                                "after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300",
                                "after:bg-white after:transition-all after:content-['']",
                                "transition-colors duration-200",
                                gift.isPurchased
                                  ? "bg-green-500 after:translate-x-full"
                                  : "bg-red-500 after:translate-x-0"
                              )}
                            />
                          </label>
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

              <div className="flex flex-row space-x-2 xs:flex-col xs:space-x-0 xs:space-y-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="xs:w-full xs:text-sm"
                >
                  {isLoading ? dict.adding : dict.addGift}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddGiftForm(false)}
                  className="xs:w-full xs:text-sm"
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
