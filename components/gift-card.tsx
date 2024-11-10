"use client";

import { memo } from "react";
import { Button } from "./ui/button";
import { Trash2, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import type { GiftCardProps } from "@/types";

export const GiftCard = memo(function GiftCard({
  gift,
  dict,
  onDelete,
  onTogglePurchased,
  animatedGiftId
}: GiftCardProps) {
  const debouncedDelete = useDebounce((id: string) => {
    onDelete(id);
  }, 300, {
    leading: true,
    trailing: false
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    debouncedDelete(gift.id);
  };

  const handleTogglePurchased = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTogglePurchased(gift.id);
  };

  const ContentWrapper = gift.url ? 'a' : 'div';
  const wrapperProps = gift.url ? {
    href: gift.url,
    target: "_blank",
    rel: "noopener noreferrer",
    className: cn(
      "p-4 pb-2 mt-1",
      "border-b",
      "block",
      "cursor-pointer"
    )
  } : {
    className: cn(
      "p-4 pb-2 mt-1",
      "border-b",
      "block",
      "cursor-default"
    )
  };

  return (
    <div className={cn(
      "flex",
      "flex-col",
      "rounded-lg",
      "border",
      "bg-card",
      "relative"
    )}>
      <ContentWrapper {...wrapperProps}>
        <div className="flex flex-row">
          <div className="flex-1">
            <h3 className={cn(
              "font-medium",
              gift.isPurchased ? 'line-through text-gray-200' : ''
            )}>
              {gift.title}
            </h3>
            {gift.description && (
              <p className={cn(
                "text-sm",
                gift.isPurchased ? 'line-through text-gray-200' : 'text-muted-foreground'
              )}>
                {gift.description}
              </p>
            )}
          </div>
          <div className="flex-none">
            {gift.isPurchased ? (
              <CheckCircle className="inline-block mr-2 text-green-500" />
            ) : (
              <Circle className={cn(
                "inline-block mr-2 text-gray-500",
                animatedGiftId === gift.id ? 'animate-fade-in' : ''
              )} />
            )}
          </div>
        </div>
      </ContentWrapper>

      <div className="flex flex-row space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="flex-1 text-red-600 hover:text-red-700 border-r rounded-none"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTogglePurchased}
          className="flex-1 transition-transform duration-300 ease-in-out rounded-none"
        >
          {gift.isPurchased ? dict.markAsAvailable : dict.markAsPurchased}
        </Button>
      </div>
    </div>
  );
});
