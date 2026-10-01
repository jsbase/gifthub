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
import ConfirmDialog from '@/components/confirm-dialog';
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
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);
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

  const removeMember = useCallback(
    async (memberId: string, memberName: string) => {
      try {
        const response = await fetch(`/api/members/${memberId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete member');
        }

        // Sonner, like every other message in the app. This used to go to the
        // Radix toast store, for which no Toaster was ever mounted, so the
        // confirmation that a member was removed never reached the screen.
        toast.success(dict.toasts.memberDeleted.replace('{name}', memberName));
        setShowDeleteButtons(false);
        onMemberDeleted();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error(dict.toasts.memberDeleteFailed);
      }
    },
    [dict.toasts.memberDeleted, dict.toasts.memberDeleteFailed, onMemberDeleted]
  );

  // A leading-edge debounce on the *request* was hiding the second half of the
  // problem: `window.confirm` blocked the page, so a fast double click could not
  // open two dialogs. Now that the confirmation is a dialog, the debounce guards
  // the network call instead, and the dialog is the only gate in front of it.
  const debouncedRemove = useDebounce(
    (memberId: string, memberName: string) => {
      removeMember(memberId, memberName);
    },
    300,
    {
      leading: true,
      trailing: false,
    }
  );

  const handleDeleteMember = useCallback(
    (memberId: string, memberName: string) => {
      setPendingRemoval({ id: memberId, name: memberName });
    },
    []
  );

  const handleConfirmRemoval = useCallback(() => {
    if (pendingRemoval) {
      debouncedRemove(pendingRemoval.id, pendingRemoval.name);
    }
  }, [pendingRemoval, debouncedRemove]);

  const toggleDeleteButtons = useCallback(
    () => setShowDeleteButtons((prev) => !prev),
    []
  );

  const memberListItems = useMemo(
    () =>
      (members || []).map((member) => {
        const counts = giftCounts[member.id] ?? { unbought: 0, total: 0 };
        const { unbought, total } = counts;
        /*
          Three states, not two. A member with nothing left to buy has had their
          list bought out; a member with no list at all is the one who most needs
          a present, and conflating the two made them invisible. The count is set
          in ink whenever there is still something to act on and recedes only
          once the list is done.
        */
        const giftCountText =
          total === 0
            ? dict.giftCount.none
            : unbought === 0
            ? dict.giftCount.zero
            : unbought === 1
            ? dict.giftCount.one
            : dict.giftCount.many.replace('{{count}}', String(unbought));
        const stillOpen = total === 0 || unbought > 0;

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
                'hover:bg-accent',
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
                <span
                  className={cn(
                    'text-[0.8125rem]',
                    'leading-tight',
                    stillOpen ? 'text-foreground' : 'text-muted-foreground'
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
    <div className='space-y-4' ref={containerRef}>
      <MemberListHeader
        dict={dict}
        onDeleteClick={toggleDeleteButtons}
        onMemberAdded={onMemberDeleted}
        hasMembers={members.length > 0}
      />

      {members.length > 0 ? (
        <ul data-testid='memberList'>
          {memberListItems}
        </ul>
      ) : (
        <p
          className={cn(
            'max-w-[40ch]',
            'pt-6',
            'text-[0.9375rem]',
            'leading-relaxed',
            'text-muted-foreground'
          )}
          data-testid='noMembers'
        >
          {dict.noMembers}
        </p>
      )}

      <ConfirmDialog
        isOpen={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={handleConfirmRemoval}
        title={dict.removeMemberConfirm}
        description={dict.confirmations.deleteMember.replace(
          '{name}',
          pendingRemoval?.name ?? ''
        )}
        confirmLabel={dict.deleteMember}
        cancelLabel={dict.cancel}
      />
    </div>
  );
};

export default MemberList;
