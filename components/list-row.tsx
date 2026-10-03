'use client';

import React, { memo } from 'react';
import {
  IconEye,
  IconPencil,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import SheetProgress from '@/components/sheet-progress';
import { cn } from '@/lib/utils';
import { giftCountLabel } from '@/lib/gift-count';
import { memberInkStyle } from '@/lib/member-ink';
import type { ListRowProps } from '@/types';

/**
 * One list on the contents page: its name, how far it reaches, what is left on
 * it, and - for the person who wrote it down - the four things that can be done
 * to it.
 *
 * **The owner's controls are absent on a row that is not the owner's, and the
 * type is what makes that true.** `onShare`, `onRename`, `onChangeVisibility` and
 * `onDelete` are all optional, and the caller on the contents page passes them
 * only for a list it owns. So a row an invited account can read carries no
 * toolbar at all, rather than one full of controls that cannot work: a greyed-out
 * rename button asks the reader to wonder whether the app is broken or the rule
 * is deliberate, and those are two very different answers with the same picture.
 * `lib/list-access.ts` is the table this is reading from, and `PRODUCT.md` treats
 * a disabled control as a question the product has not answered.
 *
 * **The ink belongs to the owner, not to the list.** `memberInkStyle` hashes
 * whatever id it is given, and it is given `list.ownerId`: one person's lists
 * all carry one ink, so the contents page reads as one person's handwriting
 * rather than as a colour per row, and the colour is stable across renames and
 * republications because neither of those touches the id it is keyed on. Passing
 * the list id instead would have given every row its own colour, and a row whose
 * name changed would have changed colour with it.
 */
const ListRow: React.FC<ListRowProps> = ({
  list,
  dict,
  onOpen,
  onShare,
  onRename,
  onChangeVisibility,
  onDelete,
  busyId,
}) => {
  const isBusy = busyId === list.id;
  const isShared = list.visibility === 'SHARED';

  /*
    Built from the handlers that exist rather than from a permission boolean, so
    there is nothing to keep in step: a control appears because the page gave this
    row a way to perform it, and a control with no handler has no rendering at
    all. Adding a fourth owner action later is one line here and no `if` at the
    call site.
  */
  const ownerActions = [
    {
      key: 'rename',
      label: dict.listBoard.rename,
      icon: IconPencil,
      testId: 'renameList',
      onSelect: onRename,
      destructive: false,
    },
    {
      key: 'share',
      label: dict.listBoard.share,
      icon: IconUserPlus,
      testId: 'shareList',
      onSelect: onShare,
      destructive: false,
    },
    {
      key: 'visibility',
      label: dict.listBoard.changeVisibility,
      icon: IconEye,
      testId: 'changeVisibility',
      onSelect: onChangeVisibility,
      destructive: false,
    },
    {
      key: 'delete',
      label: dict.listBoard.deleteList,
      icon: IconTrash,
      testId: 'deleteList',
      onSelect: onDelete,
      destructive: true,
    },
  ].filter((action) => Boolean(action.onSelect));

  const counts = list.giftCounts;

  return (
    <li
      data-testid='listRow'
      aria-busy={isBusy || undefined}
      /*
        No stagger, and the old one is deliberately not ported. It was the row's
        position in the list, and `ListRowProps` is frozen with no `index`: a row
        is handed one list, not one row of a list. Deriving a "position" from the
        id would produce a random delay pretending to be a sequence, which reads
        as jank rather than as a cascade - so the reveal is on the row and every
        row arrives together, which is what the landing plate does too.
      */
      style={memberInkStyle(list.ownerId)}
      className={cn(
        'relative',
        'grid',
        'items-center',
        'gap-x-6',
        'gap-y-2',
        'py-5',
        /*
          Both axes declared up front, and the third column only when there is
          something to put in it.

          Two columns and two rows is the truth of every row: the name and its
          figures on the first line, the owner's four controls on the second one
          below `sm`. Adding the third column only where it has content matters
          because an empty track still contributes its `gap-x-6` - a grid with
          three tracks and two children ends 24px short of its own right edge,
          which reads as a row whose contents do not reach the rule.

          From `sm` the controls join the row on the right and it is one line
          again, which is where the row was designed to be read: a name, a rule
          and a figure on a single centre line, with nothing on a line of its
          own. The old removal-mode bug was the same fault in reverse - an
          implicit third child in a two-column grid wrapped onto a second,
          CSS-sized row and every row grew from 112px to about 190px - so the
          row declares its shape rather than letting its children discover it.

          And the reason the controls below `sm` sit right rather than left, which
          is not visible in this declaration and is in the cluster's. Measured at
          390px the cluster was 358px wide - 100.00% of the row - so three owned
          lists produced three identical full-bleed icon stripes before any list
          content, and the page was majority furniture. Right-aligned, the four
          controls form one scannable column down the edge the eye already goes
          to for them and directly under the figure. Above `sm` it costs nothing:
          the third track is `auto`, so the cluster is exactly as wide as its
          contents.
        */
        'grid-cols-[1fr_auto]',
        'grid-rows-[auto_auto]',
        'sm:grid-rows-1',
        ownerActions.length > 0 && 'sm:grid-cols-[1fr_auto_auto]',
        // The contents page arriving, once, in order.
        'animate-reveal-in',
        isBusy && 'pointer-events-none opacity-60'
      )}
    >
      <Button
        variant='ghost'
        onClick={() => onOpen(list.id)}
        data-testid='openList'
        className={cn(
          'col-start-1',
          'row-start-1',
          'h-auto',
          'min-h-11',
          'min-w-0',
          /*
            The one place in this app where a control is allowed to wrap. Every
            button in `buttonVariants` is `whitespace-nowrap`, which is right for
            a label and wrong here: a row is a name plus a figure, and the row has
            to survive the longest name the product allows. A German compound is
            one unbreakable token wider than a phone, and under nowrap it ran past
            the sheet's own rule, over the figure, and gave the page a horizontal
            scrollbar.
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
      >
        {/*
          The name and the meta under it. The name is in the specimen serif,
          because a list name is a name - the same voice as the wordmark and the
          person's own name, and nothing else on the page is set in it.
        */}
        <div className='flex w-full min-w-0 flex-col items-start gap-1.5'>
          <span className='max-w-full break-words'>
            <span className='font-serif text-xl font-semibold leading-tight'>
              {list.name}
            </span>
          </span>

          {/*
            Two facts about how far this list reaches, printed under the name
            rather than in a menu. Neither is an inference: "private" and "shared"
            are the two values the owner chose, and the count is how many people
            that choice reached. Both are words - a visibility dot in a colour
            would be a state only colour carries, which is the one kind of state
            this product refuses.
          */}
          <span className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            <span className='label-print text-caption'>
              {isShared ? dict.listBoard.shared : dict.listBoard.private}
            </span>

            {/*
              Whose list it is, but only when it is not yours. On your own row
              the owner is the reader, so printing it would be a word on every
              row saying nothing; on a row somebody else shared with you it is the
              only thing that tells the two lists apart, because two people can
              own lists with the same name.

              This comment is load-bearing in a way that is worth one note. It was
              once closed with two closing braces and no terminator, and because a
              JSX comment runs until it finds a terminator it did not stop here: it
              ran on to the end of the comment below it and took the owner's name
              with it. Nothing failed. The row compiled, the row rendered, the API
              sent `isOwner: false`, and the name was simply never asked for - so
              the owner of a shared list was never named anywhere in the product,
              and every test asserting on it failed for a reason that read like a
              selector problem.

              A missing terminator inside a comment is the cheapest bug in this
              codebase to write and the most expensive to find, because it does not
              look like a syntax error at all. If a block of JSX stops being
              rendered and nothing complains, count the comment terminators before
              counting anything else.
            */}
            {!list.isOwner && (
              <span
                className='text-[0.8125rem] leading-snug text-caption'
                data-testid='listOwner'
              >
                {list.ownerDisplayName}
              </span>
            )}

            {/*
              How many people can also read it - and, when that is nobody, the
              sentence the list sheet already uses for the same fact about the
              same object. It used to print `sharedWithCount` unconditionally, so a
              `SHARED` list nobody had been added to carried "shared with: 0",
              which is not a fact about a private list either - it is a fact about
              a counter. `visibility.sharedWithNobody` says the true thing, and it
              is read from the visibility section rather than duplicated here
              because it is one fact about one list and it already has one
              sentence. The count itself comes from the same `sharedWithCount` the
              server counted rather than from a list length the client kept in step
              by hand.
            */}
            {isShared && (
              <span className='text-[0.8125rem] leading-snug text-caption'>
                {list.sharedWithCount > 0
                  ? dict.listBoard.sharedWithCount.replace(
                      '{count}',
                      String(list.sharedWithCount)
                    )
                  : dict.visibility.sharedWithNobody}
              </span>
            )}
          </span>

          {/*
            The same count in words, for anyone who cannot see the figure. It is
            inside the button rather than beside it so it is part of the control's
            accessible name, and `giftCountLabel` rather than a ternary because
            the four states are the product's, not this row's: a list with no
            ideas at all is the one that most needs a present, and mapping its
            zero to "nothing left to buy" is the defect that ladder was written
            to prevent.
          */}
          <span className='sr-only'>{giftCountLabel(counts, dict)}</span>
        </div>
      </Button>

      <SheetProgress
        unbought={counts.unbought}
        total={counts.total}
      />

      {ownerActions.length > 0 && (
        <div
          className={cn(
            'col-span-2',
            'col-start-1',
            'row-start-2',
            'flex',
            'items-center',
            'justify-end',
            'gap-1',
            'sm:col-span-1',
            'sm:col-start-3',
            'sm:row-start-1'
          )}
        >
          {ownerActions.map((action) => {
            const Icon = action.icon;
            return (
              <React.Fragment key={action.key}>
                {/*
                  A hairline before the destructive control, and not colour. At
                  rest the bin and the pencil are the same ink at the same weight
                  and four identical glyphs in a row read as one undifferentiated
                  group; the rule is what this product separates things with, and
                  `DESIGN.md` reserves the red for a button fill, so tinting the
                  bin would spend the one semantic colour in the app on a resting
                  state that is not yet destructive.
                */}
                {action.destructive && (
                  <span aria-hidden='true' className='mx-1.5 h-6 w-px bg-rule' />
                )}
                <Button
                  variant='ghost'
                  size='icon'
                  /*
                    `disabled`, and not only a pointer-events guard. Blocking the
                    mouse leaves the button keyboard-activatable, so Enter during an
                    in-flight PATCH would fire the second mutation at the same row -
                    which is what `busyId` exists to make impossible.
                  */
                  disabled={isBusy}
                  onClick={() => action.onSelect?.(list.id)}
                  aria-label={action.label}
                  data-testid={action.testId}
                  className={cn(
                    'text-caption',
                    'transition-colors',
                    action.destructive
                      ? '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-destructive [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink-foreground'
                      : '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink'
                  )}
                >
                  <Icon className='h-4 w-4' aria-hidden='true' />
                </Button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </li>
  );
};

export default memo(ListRow);