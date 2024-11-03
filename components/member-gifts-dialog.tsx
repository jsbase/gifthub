"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { PlusCircle, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Gift } from "@/types";

interface MemberGiftsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memberEmail: string;
  memberId: string;
  gifts: Gift[];
  onGiftAdded: () => void;
}

export function MemberGiftsDialog({ 
  isOpen, 
  onClose, 
  memberEmail, 
  memberId,
  gifts,
  onGiftAdded 
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

      toast.success('Gift added successfully');
      setShowAddGiftForm(false);
      onGiftAdded();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error('Failed to add gift');
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

      toast.success('Gift status updated');
      onGiftAdded(); // Refresh the list
    } catch (error) {
      toast.error('Failed to update gift status');
    }
  };

  const handleDeleteGift = async (giftId: string) => {
    if (!confirm('Are you sure you want to delete this gift?')) {
      return;
    }

    try {
      const response = await fetch(`/api/gifts/${giftId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete gift');
      }

      toast.success('Gift deleted successfully');
      onGiftAdded(); // Refresh the list
    } catch (error) {
      toast.error('Failed to delete gift');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Wish List for {memberEmail}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button
            onClick={() => setShowAddGiftForm(true)}
            className="w-full"
            variant="outline"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Gift
          </Button>

          {showAddGiftForm && (
            <form onSubmit={handleAddGift} className="space-y-4 border rounded-lg p-4">
              <div className="space-y-2">
                <Label htmlFor="title">Gift Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter gift title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter gift description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL (Optional)</Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder="Enter gift URL"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddGiftForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add Gift'}
                </Button>
              </div>
            </form>
          )}

          {gifts.length > 0 ? (
            <div className="space-y-4">
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-grow">
                      <h3 className="font-medium">{gift.title}</h3>
                      {gift.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {gift.description}
                        </p>
                      )}
                      {gift.url && (
                        <a
                          href={gift.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-1 block"
                        >
                          View Link
                        </a>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePurchased(gift.id)}
                        className={gift.isPurchased ? "text-green-600" : ""}
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
                        onClick={() => handleDeleteGift(gift.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No gifts added yet for this member.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
