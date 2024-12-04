import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddMemberDialog from '@/components/add-member-dialog';
import { cn } from '@/lib/utils';
import type { MemberListHeaderProps } from '@/types';

const MemberListHeader: React.FC<MemberListHeaderProps> = ({
  dict,
  onDeleteClick,
  onMemberAdded,
  hasMembers
}) => {
  return (
    <div className={cn(
      "flex",
      "flex-col sm:flex-row",
      "sm:items-center",
      "sm:justify-between",
      "gap-2"
    )}>
      <h2 className="text-2xl font-bold">
        {dict.members}
      </h2>
      <div className={cn(
        "grid",
        "grid-cols-2",
        "gap-2",
        "w-full",
        "sm:w-auto"
      )}>
        <Button
          variant="outline"
          onClick={onDeleteClick}
          disabled={!hasMembers}
          className={cn(
            "flex",
            "items-center",
            "justify-center",
            "gap-2",
            !hasMembers && "opacity-50 cursor-not-allowed"
          )}
        >
          <Trash2 className="h-4 w-4" />
          {dict.deleteMember}
        </Button>
        <AddMemberDialog onMemberAdded={onMemberAdded} />
      </div>
    </div>
  );
};

export default memo(MemberListHeader);
