import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MemberListHeader from '@/components/member-list-header';
import { toast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { MemberListProps } from '@/types';

const MemberList: React.FC<MemberListProps> = ({
  members = [],
  giftCounts,
  dict,
  onMemberClick,
  onMemberDeleted,
}) => {
  const [showDeleteButtons, setShowDeleteButtons] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useMemo(
    () => (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        showDeleteButtons
      ) {
        setShowDeleteButtons(false);
      }
    },
    [showDeleteButtons]
  );

  useEffect(() => {
    if (showDeleteButtons) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteButtons, handleClickOutside]);

  const debouncedDelete = useDebounce(
    async (memberId: string, memberName: string) => {
      if (
        !confirm(dict.confirmations.deleteMember.replace('{name}', memberName))
      ) {
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
          variant: 'default',
        });
        setShowDeleteButtons(false);
        onMemberDeleted();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast({
          title: dict.toasts.memberDeleteFailed,
          variant: 'destructive',
        });
      }
    },
    300,
    {
      leading: true,
      trailing: false,
    }
  );

  const handleDeleteMember = useCallback(
    (memberId: string, memberName: string) => {
      debouncedDelete(memberId, memberName);
    },
    [debouncedDelete]
  );

  const toggleDeleteButtons = useCallback(
    () => setShowDeleteButtons((prev) => !prev),
    []
  );

  const memberListItems = useMemo(
    () =>
      (members || []).map((member) => (
        <li
          key={member.id}
          className={cn(
            'relative',
            'overflow-hidden',
            'rounded-lg',
            'bg-card',
            'flex'
          )}
        >
          <Button
            variant='ghost'
            className={cn(
              'flex-1',
              'pr-4 pl-4',
              'h-auto',
              'hover:bg-accent',
              'flex',
              'items-center',
              'justify-between'
            )}
            onClick={() => onMemberClick(member.id)}
            data-testid='showGiftsDialog'
          >
            <div className={cn('flex flex-col', 'items-start')}>
              <p className='font-medium'>{member.name}</p>
              <p className={cn('text-sm', 'text-muted-foreground')}>
                {giftCounts[member.id] === 0
                  ? dict.giftCount.zero
                  : giftCounts[member.id] === 1
                  ? dict.giftCount.one
                  : dict.giftCount.many.replace(
                      '{{count}}',
                      String(giftCounts[member.id])
                    )}
              </p>
            </div>
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
          </Button>
          {showDeleteButtons && (
            <div
              className={cn('animate-slide-in', 'flex items-center', 'pr-2')}
            >
              <Button
                variant='destructive'
                size='icon'
                onClick={() => handleDeleteMember(member.id, member.name)}
              >
                <Trash2 className={cn('h-4', 'w-4')} />
              </Button>
            </div>
          )}
        </li>
      )),
    [
      members,
      giftCounts,
      dict.giftCount,
      showDeleteButtons,
      onMemberClick,
      handleDeleteMember,
    ]
  );

  return (
    <div className='space-y-4' ref={containerRef}>
      <MemberListHeader
        dict={dict}
        onDeleteClick={toggleDeleteButtons}
        onMemberAdded={onMemberDeleted}
        hasMembers={members.length > 0}
      />

      {members.length > 0 ? (
        <ul className='space-y-2' data-testid='memberList'>
          {memberListItems}
        </ul>
      ) : (
        <div className='text-muted-foreground'>{dict.noMembers}</div>
      )}
    </div>
  );
};

export default MemberList;
