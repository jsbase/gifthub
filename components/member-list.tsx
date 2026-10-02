import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import MemberListHeader from '@/components/member-list-header';
import ConfirmDialog from '@/components/confirm-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
import SheetProgress from '@/components/sheet-progress';
import type { MemberListProps } from '@/types';

/**
 * The contents page of the album: every member, and how much of their sheet is
 * still unfilled.
 *
 * The count is not a sentence here. It is a miniature of the member's own grid -
 * one small cell per idea, collected cells inverted - because "who still needs
 * something" is the only question this screen exists to answer, and a row of
 * small squares answers it faster than a sentence in any of the three languages
 * this app ships. It also scales: the same figure reads correctly for three
 * members and for thirty, where a sentence per row would not.
 *
 * Three states, not two, and the product refuses to conflate them. A member with
 * nothing left to buy has had their list handled; a member with no list at all
 * is the one who most needs a present. Their grids do not look alike - an empty
 * member gets a dashed placeholder cell rather than a solid one - and both say
 * so in words for anyone who cannot see the figure.
 */
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
      (members || []).map((member, index) => {
        const counts = giftCounts[member.id] ?? { unbought: 0, total: 0 };
        const { unbought, total } = counts;
        const giftCountText = giftCountLabel(counts, dict);

        return (
          <li
            key={member.id}
            /*
              The delay belongs in `style`, not in `cn()`. `cn` is clsx plus
              twMerge: clsx stringifies an object into a class token, so passing
              `{ animationDelay }` there produced a garbage class name and the
              stagger never applied at all - the list appeared with no sequence.

              The index is capped rather than guarded by a conditional, so the
              tenth row and beyond share the last delay instead of queueing
              behind a long list.
            */
            style={{
              ...memberInkStyle(member.id),
              animationDelay: `${Math.min(index, 9) * 45}ms`,
            }}
            className={cn(
              'relative',
              'grid',
              'items-center',
              'gap-x-6',
              'py-5',
              /*
                Three columns in removal mode, two outside it - and never an
                implicit third.

                This row is declared `grid-cols-[1fr_auto]`, which is a promise
                about how many children it has. The remove control was a third
                child, so it did not join the row: it wrapped onto an implicit
                second row, and CSS sized that row from the 44px button plus the
                24px row-gap on top of the 72px first one. Every member became
                190px tall with the control tucked under its own name, which is
                why removal mode looked like a different app - a list with three
                times the white space, a second reading order, and nothing on the
                same baseline as the rule above it.

                Declaring the third column up front is the whole fix. The row
                keeps its height, its rules keep their rhythm, the figure stays on
                the same baseline as the name, and entering the mode costs the
                list no vertical space at all. The control is 44px against the
                row's 72px floor, so it can never become the tall thing either.
              */
              showDeleteButtons
                ? 'grid-cols-[1fr_auto_auto]'
                : 'grid-cols-[1fr_auto]',
              // The contents page arriving, once, in order.
              'animate-reveal-in'
            )}
          >
            <Button
              variant='ghost'
              className={cn(
                'h-auto',
                'min-h-[72px]',
                'min-w-0',
                /*
                  The one place in this app where a control is allowed to wrap.
                  Every button in `buttonVariants` is `whitespace-nowrap`, which is
                  right for a label and wrong here: a row is a label plus a
                  figure, and the row has to survive the longest name the product
                  allows. A German compound or a Russian patronymic is one
                  unbreakable token wider than a phone; under nowrap it ran past
                  the sheet's own rule, over the count figure, and gave the page a
                  horizontal scrollbar. `break-words` on the name below could not
                  fix this, because nowrap removes the soft-wrap opportunity that
                  break-words depends on.
                */
                'whitespace-normal',
                'items-center',
                'gap-4',
                'px-0',
                'rounded-none',
                'text-left',
                'text-ink',
                'transition-colors',
                'duration-150',
                'hover:bg-transparent'
              )}
              onClick={() => onMemberClick(member.id)}
              data-testid='showGiftsDialog'
            >
              {/*
                The name and the rule under it. The rule is the member's own ink,
                which is the one place the ink tray is allowed a horizontal line -
                it is the hand of the album's index marking whose sheet this is.
              */}
              <div className='flex min-w-0 flex-col items-start gap-2 w-full'>
                <span className='max-w-full break-words'>
                  <span
                    className={cn(
                      'font-serif',
                      'text-xl',
                      'font-semibold',
                      'leading-tight'
                    )}
                  >
                    {member.name}
                  </span>
                </span>
                <span className='sr-only'>{giftCountText}</span>
              </div>
            </Button>

            <SheetProgress unbought={unbought} total={total} />

            {showDeleteButtons && (
              <div className={cn('animate-row-reveal', 'flex', 'items-center')}>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => handleDeleteMember(member.id, member.name)}
                  className={cn(
                    'text-destructive',
                    'transition-colors',
                    'hover:bg-destructive',
                    'hover:text-ink-foreground'
                  )}
                  data-testid='removeMemberButton'
                >
                  <IconTrash className='h-4 w-4' />
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
      dict,
      showDeleteButtons,
      onMemberClick,
      handleDeleteMember,
    ]
  );

  return (
    <div className='grid gap-0' ref={containerRef}>
      <MemberListHeader
        dict={dict}
        onDeleteClick={toggleDeleteButtons}
        onMemberAdded={onMemberDeleted}
        hasMembers={members.length > 0}
        isRemoving={showDeleteButtons}
      />

      {members.length > 0 ? (
        <ul data-testid='memberList' className='divide-y divide-rule'>
          {memberListItems}
        </ul>
      ) : (
        <p
          className={cn(
            'max-w-[44ch]',
            'border border-dashed',
            'border-rule',
            'px-5',
            'py-8',
            'text-[0.9375rem]',
            'leading-relaxed',
            'text-caption'
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