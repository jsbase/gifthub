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
  hasMembers,
}) => {
  return (
    <div
      className={cn(
        'flex',
        'flex-col',
        'gap-5',
        'border-b',
        'border-border',
        'pb-6',
        'sm:flex-row',
        'sm:items-end',
        'sm:justify-between',
        'sm:gap-6'
      )}
    >
      <h2
        className={cn(
          'font-serif',
          'text-3xl',
          'font-semibold',
          'leading-none',
          'tracking-[-0.01em]'
        )}
      >
        {dict.members}
      </h2>
      {/*
        Stacked at 390px, side by side once there is room: at the narrow end two
        German or Russian labels do not fit on one line each.
      */}
      <div
        className={cn(
          'grid',
          'grid-cols-1',
          'gap-3',
          'w-full',
          'min-[26rem]:grid-cols-2',
          'sm:w-auto'
        )}
      >
        <Button
          variant='outline'
          onClick={onDeleteClick}
          disabled={!hasMembers}
          className={cn(
            'flex',
            'items-center',
            'justify-center',
            'gap-2',
            'text-[0.875rem]'
          )}
          data-testid='showRemoveMemberButtons'
        >
          <Trash2 className='h-4 w-4' />
          {dict.deleteMember}
        </Button>
        <AddMemberDialog onMemberAdded={onMemberAdded} />
      </div>
    </div>
  );
};

export default memo(MemberListHeader);
