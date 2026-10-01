import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import MemberListHeader from '@/components/member-list-header';
import ConfirmDialog from '@/components/confirm-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
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
            style={memberInkStyle(member.id)}
            className={cn(
              'relative',
              'grid',
              'grid-cols-[1fr_auto]',
              'gap-6',
              'items-center',
              'py-5',
              // The contents page arriving, once, in order. Capped in CSS by the
              // animation-delay ceiling; the tenth row and beyond share the last
              // delay rather than queueing behind a long list.
              'animate-reveal-in',
              index < 10 && { animationDelay: `${index * 45}ms` }
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
                  <span
                    aria-hidden='true'
                    className='mt-2 block h-1.5 w-24 bg-[var(--member-ink)]'
                  />
                </span>
                <span className='sr-only'>{giftCountText}</span>
              </div>
            </Button>

            <CellFigure unbought={unbought} total={total} />

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
                    'hover:text-ink-foreground'
                  )}
                  data-testid='removeMemberButton'
                >
                  <Trash2 className='h-4 w-4' />
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

/**
 * A member's sheet in miniature: one cell per idea, collected cells inverted,
 * and the count beside it in printed numerals.
 *
 * Open cells read first, because open cells are what needs acting on. A member
 * with no ideas at all gets a single dashed cell rather than nothing, so "empty"
 * is visibly different from "nothing to show" and from "bought out".
 *
 * The whole figure is `aria-hidden` because the row already carries the same
 * fact as real text; a shape is not an announcement.
 */
const CellFigure: React.FC<{ unbought: number; total: number }> = ({
  unbought,
  total,
}) => {
  const shown = Math.min(total, 14);
  const overflow = total - shown;

  return (
    <span aria-hidden='true' className='flex shrink-0 items-center gap-3'>
      <span className='flex flex-wrap justify-end gap-[3px]'>
        {total === 0 ? (
          <span className='block h-3.5 w-3.5 border border-dashed border-rule' />
        ) : (
          Array.from({ length: shown }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'block',
                'h-3.5',
                'w-3.5',
                'border',
                'border-rule',
                i < unbought ? 'bg-cell' : 'border-collected bg-collected'
              )}
            />
          ))
        )}
      </span>
      <span
        className={cn(
          'font-label',
          'min-w-[2ch]',
          'text-right',
          'text-[0.8125rem]',
          'font-bold',
          'tabular-nums',
          'tracking-[0.06em]',
          unbought > 0 ? 'text-ink' : 'text-caption'
        )}
      >
        {unbought}
      </span>
      {overflow > 0 && (
        <span className='font-label text-[0.6875rem] font-bold tracking-[0.06em] text-caption'>
          +{overflow}
        </span>
      )}
    </span>
  );
};

export default MemberList;
