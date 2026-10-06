'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { giftCountLabel } from '@/lib/gift-count';
import { cn } from '@/lib/utils';
import type { TransferDialogProps } from '@/types';

/**
 * WHERE A SELECTION OF WISHES GOES.
 *
 * **One commit, and the verb is already chosen.** The sheet below lists
 * the caller's own lists; picking one does not commit anything, and the
 * single button at the foot does - *Copy here* or *Move here*, whichever
 * verb the reader pressed on the sheet that opened this one. That is the
 * whole argument for the shape, and it is worth stating because the
 * obvious alternative is a pair of buttons: with the verb already decided,
 * two commits would offer a second decision the reader has already made,
 * and two inert buttons - both disabled until a row is chosen - would be
 * two controls where one says everything. One decision at a time, and no
 * state to get wrong.
 *
 * **The source list is not in the list at all.** It is filtered out upstream, in
 * `ListSheet`, and that is deliberate rather than a detail of where the filter
 * happens: a destination equal to the source is the one thing this dialog could
 * offer that the server refuses, and `already_on_this_list` exists for a request
 * built some other way. Offering a row that cannot be pressed is the defect
 * `PRODUCT.md:66` names - a control a reader may not use.
 *
 * **A failed prefetch shows a sentence and a retry, not an empty list.** The rows
 * are fetched when the transfer mode is entered rather than when this opens, so a
 * failure here is a failed request and not an account with no lists - and rendering
 * it as "you have no other lists" would tell the reader to go and make one, which is
 * advice for a situation they are not in. The empty state and the failure state are
 * therefore different sentences on screen at the same moment.
 *
 * This component performs nothing. It reports a list and a mode and the caller does
 * the request, which is what lets `ListSheet` keep owning every gift mutation and
 * leaves this a list of rows and one button.
 */
const TransferDialog: React.FC<TransferDialogProps> = ({
  isOpen,
  onClose,
  lists,
  isLoading,
  sourceListName,
  dict,
  loadFailed,
  onRetry,
  mode,
  isPending,
  onTransfer,
}) => {
  /*
    The destination the reader picked, which is local and therefore free - selecting
    a row is never a request. It is a `string | null` rather than an index so that
    reordering or re-fetching the list cannot make a selection point at a different
    list than the one the reader picked.
  */
  const [pickedId, setPickedId] = useState<string | null>(null);

  /*
    The destination that is actually chosen: the picked one, but only while it is
    still one of the rows on offer. Derived rather than reset, so there is no render
    in which the button is enabled for a list that is no longer shown - the sheet
    reloads these rows when a transfer is refused because a list has gone, and a
    pick of that list would otherwise commit against an id the reader can no longer
    see, into the same refusal.
  */
  const targetId = lists.some((list) => list.id === pickedId) ? pickedId : null;

  /*
    Cleared when the dialog closes, not on open. A reader who opens the picker for a
    second batch would otherwise find the previous destination still chosen - which
    for the common case of filing two batches into the same list is a helpful
    shortcut, and for a reader who means to file into a *different* list is a control
    that starts out wrong. Clearing on close keeps it honest: it opens with nothing
    chosen, every time.
  */
  const close = () => {
    setPickedId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent closeLabel={dict.close} data-testid='transferDialog'>
        <DialogHeader>
          {/*
            The title names the list the wishes are leaving, because this sheet opens
            over that sheet and the reader is looking at it - but a dialog whose title
            is a fixed string would be ambiguous the moment two of them could be open
            at once, and `PRODUCT.md` treats a question the product can answer as one
            it must.
          */}
          <DialogTitle data-testid='transferDialogTitle'>
            {dict.transferDialog.title}
          </DialogTitle>
          <DialogDescription>{sourceListName}</DialogDescription>
        </DialogHeader>

        {loadFailed ? (
          <div
            className='flex flex-col gap-3 py-2'
            data-testid='transferDialogError'
          >
            {/*
              A failed request, not an empty account. `noLists` would tell this reader
              to go and make a list, which is the wrong instruction entirely for
              somebody whose lists are perfectly fine and whose network was not.
            */}
            <p className='max-w-[44ch] text-[0.9375rem] leading-relaxed text-pretty text-caption'>
              {dict.transferDialog.error}
            </p>
            <Button
              type='button'
              variant='outline'
              onClick={onRetry}
              className='w-fit'
              data-testid='transferDialogRetry'
            >
              {dict.transferDialog.retry}
            </Button>
          </div>
        ) : isLoading ? (
          /*
            The prefetch is still in flight. The sheet starts it when the transfer
            mode is entered rather than when this opens, which is what makes the
            dialog fast - but "fast" is not "already finished", and a reader who taps
            the button the instant the bar appears lands here. The alternative was
            the empty state, which says they have no other lists, and that is not a
            fact this dialog knows.
          */
          <div
            className='grid place-items-center py-8'
            data-testid='transferDialogLoading'
          >
            {/*
              The same mark `LoadingSpinner` draws, at the size that belongs inside a
              sheet - and deliberately *not* that component. It is a fixed, full-screen
              portal with a scrim over everything, which belongs to a route change and
              would here hide the very dialog the reader opened. Reusing the asset
              rather than the component is what keeps that distinction.
            */}
            <Image
              src='/loading.svg'
              alt=''
              width={24}
              height={24}
              className={cn('animate-spin', 'dark:invert')}
            />
          </div>
        ) : lists.length === 0 ? (
          <p
            className='max-w-[44ch] py-2 text-[0.9375rem] leading-relaxed text-pretty text-caption'
            data-testid='transferDialogNoLists'
          >
            {dict.listBoard.noLists}
          </p>
        ) : (
          /*
            The list is the one part of this dialog that scrolls, and that is the
            point of the three classes that are not about looks.

            `DialogContent` scrolls its whole body, which is right for a form and
            wrong for this: the button that commits the transfer is the last thing
            in it, so with seven lists on a 667px phone it sat below the fold, and
            at 800px on a desktop it was clipped by the sheet's own edge. Measured,
            not guessed - and the title scrolled away with the rows, which left a
            reader choosing a destination without the sentence that says what is
            being filed.

            `min-h-0` is what lets this shrink: a flex item will not go below its
            content height by default, so without it the list would push the footer
            out of the sheet instead of scrolling inside it. It is deliberately not
            `flex-1` - that sets the basis to 0% and, above `sm` where the sheet
            hugs its content, collapses the list to nothing (the note in
            `components/ui/dialog.tsx` is about the same trap one level up). With
            few lists the list is exactly its rows and nothing scrolls; with many it
            gives way and the header and the footer stay where they are.

            `-mx-1.5 px-1.5` is room for the focus ring. `overflow-y: auto` makes
            `overflow-x` clip too, and the radio sits against the left edge of its
            row, so its 4px ring - drawn outside the box - was cut off at the left.
            The negative margin and the padding cancel, so the rows are the width
            they were.
          */
          <ul
            className='-mx-1.5 flex min-h-0 flex-col divide-y divide-rule overflow-y-auto px-1.5'
            data-testid='transferTargetList'
          >
            {lists.map((list) => {
              const isChosen = targetId === list.id;

              return (
                <li key={list.id}>
                  {/*
                    A radio, not a row with a click handler. The reader is choosing
                    one destination out of several - the verb was decided on the
                    sheet that opened this one - and a
                    list of mutually exclusive choices is what a radio group is for:
                    it announces how many options there are, arrow keys move between
                    them, and the current choice is something the interface states
                    rather than something it has to remember and redraw. A `<div>`
                    with an `onClick` would be reachable by mouse alone.
                  */}
                  <label
                    className={cn(
                      'flex',
                      'cursor-pointer',
                      'items-center',
                      'gap-3',
                      'py-3',
                      'transition-colors',
                      '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash'
                    )}
                  >
                    <input
                      type='radio'
                      name='transferTarget'
                      value={list.id}
                      checked={isChosen}
                      onChange={() => setPickedId(list.id)}
                      disabled={isPending}
                      className='h-4 w-4 shrink-0 accent-ink'
                      data-testid={`transferTarget-${list.id}`}
                    />

                    <span className='flex min-w-0 flex-1 flex-col gap-1'>
                      <span className='break-words text-[0.9375rem] text-ink'>
                        {list.name}
                      </span>

                      {/*
                        The same three facts the contents page prints for a list -
                        reach and what is left - and printed the same way, so a list
                        is described identically everywhere it appears. The count is
                        `giftCountLabel` rather than a numeral for the same reason it
                        is there: "3 wishes still needed" in the reader's language,
                        with its four states, instead of a figure that means nothing
                        on its own.
                      */}
                      <span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                        <StatusBadge
                          variant={
                            list.visibility === 'SHARED' ? 'shared' : 'private'
                          }
                          label={
                            list.visibility === 'SHARED'
                              ? dict.listBoard.shared
                              : dict.listBoard.private
                          }
                        />
                        <span className='text-[0.8125rem] leading-relaxed text-caption'>
                          {giftCountLabel(list.giftCounts, dict)}
                        </span>
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter className='xs:mt-auto'>
          {/*
            One button, disabled until a destination is chosen. The verb was
            decided on the sheet that opened this dialog, so the button's label
            is the verb the reader already pressed, and while its request is in
            flight the same button swaps to its own progress wording - `copying`
            or `moving`, chosen by `mode`, so the button that is working is the
            button that names itself.
          */}
          <Button
            type='button'
            variant='outline'
            disabled={targetId === null || isPending}
            onClick={() => targetId && onTransfer(targetId, mode)}
            className='xs:w-full'
            data-testid={mode === 'copy' ? 'transferCopyHere' : 'transferMoveHere'}
          >
            {isPending
              ? mode === 'copy'
                ? dict.transferDialog.copying
                : dict.transferDialog.moving
              : mode === 'copy'
                ? dict.transferDialog.copyHere
                : dict.transferDialog.moveHere}
          </Button>

          <Button
            type='button'
            variant='ghost'
            onClick={close}
            className='xs:w-full'
            data-testid='transferCancel'
          >
            {dict.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;