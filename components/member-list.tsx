import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Member } from "@/types";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import AddMemberDialog from "@/components/add-member-dialog";
import { toast } from '@/hooks/use-toast';

interface MemberListProps {
  members: Member[];
  giftCounts: Record<string, number>;
  dict: any;
  onMemberClick: (id: string) => void;
  onMemberDeleted: () => void;
}

export function MemberList({
  members,
  giftCounts,
  dict,
  onMemberClick,
  onMemberDeleted
}: MemberListProps) {
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node) &&
      showDeleteButtons
    ) {
      setShowDeleteButtons(false);
    }
  }, [showDeleteButtons]);

  useEffect(() => {
    if (showDeleteButtons) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteButtons, handleClickOutside]);

  const handleDeleteMember = useCallback(async (memberId: string, memberName: string) => {
    if (!confirm(dict.confirmations.deleteMember.replace('{name}', memberName))) {
      return;
    }

    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete member');
      }

      toast({
        title: dict.toasts.memberDeleted.replace('{name}', memberName),
        variant: "default"
      });
      onMemberDeleted();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: dict.toasts.memberDeleteFailed,
        variant: "destructive"
      });
    }
  }, [dict.confirmations.deleteMember, dict.toasts.memberDeleted, dict.toasts.memberDeleteFailed, onMemberDeleted]);

  const toggleDeleteButtons = useCallback(() => {
    setShowDeleteButtons(prev => !prev);
  }, []);

  // Memoize the member list items to prevent unnecessary re-renders
  const memberListItems = useMemo(() => (
    members.map((member) => (
      <li
        key={member.id}
        className={cn(
          "relative",
          "overflow-hidden",
          "rounded-lg",
          "bg-card",
          "flex"
        )}
      >
        <Button
          variant="ghost"
          className={cn(
            "flex-1",
            "pr-4 pl-4",
            "h-auto",
            "hover:bg-accent",
            "flex",
            "items-center",
            "justify-between"
          )}
          onClick={() => onMemberClick(member.id)}
        >
          <div className={cn("flex flex-col", "items-start")}>
            <p className="font-medium">{member.name}</p>
            <p className={cn("text-sm", "text-muted-foreground")}>
              {giftCounts[member.id] === 0
                ? dict.giftCount.zero
                : giftCounts[member.id] === 1
                  ? dict.giftCount.one
                  : dict.giftCount.many.replace('{{count}}', String(giftCounts[member.id]))}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
        {showDeleteButtons && (
          <div className={cn(
            "animate-slide-in",
            "flex items-center",
            "pr-2"
          )}>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => handleDeleteMember(member.id, member.name)}
            >
              <Trash2 className={cn("h-4", "w-4")} />
            </Button>
          </div>
        )}
      </li>
    ))
  ), [members, giftCounts, dict.giftCount, showDeleteButtons, onMemberClick, handleDeleteMember]);

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className={cn(
        "flex",
        "flex-col sm:flex-row",
        "sm:items-center",
        "sm:justify-between",
        "gap-2"
      )}>
        <div className={cn(
          "grid",
          "grid-cols-2",
          "gap-2",
          "w-full",
          "sm:w-auto"
        )}>
          <Button
            variant="outline"
            onClick={toggleDeleteButtons}
            className={cn(
              "flex",
              "items-center",
              "justify-center",
              "gap-2"
            )}
          >
            <Trash2 className="h-4 w-4" />
            {dict.deleteMember}
          </Button>
          <AddMemberDialog onMemberAdded={onMemberDeleted} />
        </div>
      </div>

      <ul className="space-y-2">
        {memberListItems}
      </ul>
    </div>
  );
}
