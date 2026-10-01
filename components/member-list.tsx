import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import MemberListHeader from '@/components/member-list-header';
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

        // Sonner, like every other message in the app. This used to go to the
        // Radix toast store, for which no Toaster is ever mounted, so the
        // confirmation that a member was removed never reached the screen.
        toast.success(dict.toasts.memberDeleted.replace('{name}', memberName));
        setShowDeleteButtons(false);
        onMemberDeleted();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error(dict.toasts.memberDeleteFailed);
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
      (members || []).map((member) => {
        const count = giftCounts[member.id];
        const giftCountText =
          count === 0
            ? dict.giftCount.zero
            : count === 1
            ? dict.giftCount.one
            : dict.giftCount.many.replace('{{count}}', String(count));

        return (
          <li
            key={member.id}
            className={cn(
              'relative',
              'flex',
              'items-stretch',
              'border-b',
              'border-border',
              'last:border-b-0'
            )}
          >
            <Button
              variant='ghost'
              className={cn(
                'flex-1',
                'h-auto',
                'min-h-16',
                'items-center',
                'justify-between',
                'gap-3',
                'px-2',
                'py-3.5',
                '-mx-2',
                'rounded-md',
                'text-left',
                'text-foreground',
                'transition-colors',
                'duration-150',
                'hover:bg-foreground/[0.05]',
                'hover:text-foreground'
              )}
              onClick={() => onMemberClick(member.id)}
              data-testid='showGiftsDialog'
            >
              <span className={cn('flex', 'flex-col', 'items-start', 'gap-1')}>
                <span
                  className={cn(
                    'font-serif',
                    'text-lg',
                    'font-semibold',
                    'leading-tight'
                  )}
                >
                  {member.name}
                </span>
                {/*
                  The count of gift ideas still to buy is the one number this
                  screen exists to show, so it is set in ink when there is
                  something left to choose and in secondary grey when there is
                  nothing - the eye lands on the people still waiting for a
                  present.
                */}
                <span
                  className={cn(
                    'text-[0.8125rem]',
                    'leading-tight',
                    count > 0 ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {giftCountText}
                </span>
              </span>
              <ChevronRight
                className={cn(
                  'h-4',
                  'w-4',
                  'shrink-0',
                  'text-muted-foreground',
                  'transition-opacity',
                  showDeleteButtons && 'opacity-0'
                )}
              />
            </Button>
            {showDeleteButtons && (
              <div
                className={cn(
                  'animate-row-reveal',
                  'flex',
                  'items-center',
                  'pl-2'
                )}
              >
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => handleDeleteMember(member.id, member.name)}
                  className={cn(
                    'text-destructive',
                    'transition-colors',
                    'hover:bg-destructive',
                    'hover:text-destructive-foreground'
                  )}
                  data-testid='removeMemberButton'
                >
                  <Trash2 className={cn('h-4', 'w-4')} />
                  <span className='sr-only'>{dict.deleteMember}</span>
                </Button>
              </div>
            )}
          </li>
        );
      }),
    [
      members,
      giftCounts,
      dict.giftCount,
      dict.deleteMember,
      showDeleteButtons,
      onMemberClick,
      handleDeleteMember,
    ]
  );

  return (
    <div className='space-y-2' ref={containerRef}>
      <MemberListHeader
        dict={dict}
        onDeleteClick={toggleDeleteButtons}
        onMemberAdded={onMemberDeleted}
        hasMembers={members.length > 0}
      />

      {members.length > 0 ? (
        <ul className='-mt-2' data-testid='memberList'>
          {memberListItems}
        </ul>
      ) : (
        <p
          className={cn(
            'max-w-[40ch]',
            'pt-8',
            'text-[0.9375rem]',
            'leading-relaxed',
            'text-muted-foreground'
          )}
          data-testid='noMembers'
        >
          {dict.noMembers}
        </p>
      )}
    </div>
  );
};

export default MemberList;
