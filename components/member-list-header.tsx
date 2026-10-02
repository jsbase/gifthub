import React, { memo } from 'react';
import { IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import AddMemberDialog from '@/components/add-member-dialog';
import { cn } from '@/lib/utils';
import type { MemberListHeaderProps } from '@/types';

const MemberListHeader: React.FC<MemberListHeaderProps> = ({
  dict,
  onDeleteClick,
  onMemberAdded,
  hasMembers,
  isRemoving,
}) => {
  return (
    <div
      className={cn(
        'flex',
        'flex-col',
        'gap-4',
        'border-b',
        'border-rule',
        'pb-4',
        'sm:flex-row',
        'sm:items-end',
        'sm:justify-between',
        'sm:gap-6'
      )}
    >
      {/*
        A printed section label rather than a page heading. It is how a specimen
        catalogue marks a section of a page, and it is deliberately not the size
        the section used to be: on a contents page the list itself is the thing
        worth looking at, and a 30px heading above it made the rows read as the
        caption to a title rather than as the contents.
      */}
      <h2 className='label-print pt-1 text-caption'>{dict.members}</h2>
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
        {/*
          A toggle, so it says it is one. The mode's only other trace is that a
          remove control appears on every row, which is announced at the row; a
          screen-reader user holding this button otherwise has no way to know
          whether the thing they are holding is armed.
        */}
        <Button
          variant='outline'
          onClick={onDeleteClick}
          disabled={!hasMembers}
          aria-pressed={isRemoving}
          className={cn(
            'flex',
            'items-center',
            'justify-center',
            'gap-2',
            'text-[0.875rem]'
          )}
          data-testid='showRemoveMemberButtons'
        >
          <IconTrash className='h-4 w-4' />
          {dict.deleteMember}
        </Button>
        <AddMemberDialog onMemberAdded={onMemberAdded} />
      </div>
    </div>
  );
};

export default memo(MemberListHeader);
