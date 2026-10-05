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
 * **Two commits and no mode.** The sheet below lists the caller's own lists; picking
 * one does not commit anything, and two buttons at the foot do - *Copy here* and
 * *Move here*. That is the whole argument for the shape, and it is worth stating
 * because the obvious alternative is a two-position switch above the list: the mode
 * is a verb applied to a list the reader has already chosen, so it belongs on the
 * things that perform it. A switch would mean deciding copy-or-move *before*
 * choosing where, holding two pieces of state at once, and putting on screen a
 * "mode" with no meaning until a second decision gives it one. One decision at a
 * time, and no state to get wrong.
 *
 * **The source list is not in the list at all.** It is filtered out upstream, in
 * `ListSheet`, and that is deliberate rather than a detail of where the filter
 * happens: a destination equal to the source is the one thing this dialog could
 * offer that the server refuses, and `already_on_this_list` exists for a request
 * built some other way. Offering a row that cannot be pressed is the defect
 * `PRODUCT.md:66` names - a control a reader may not use.
 *
 * **A failed prefetch shows a sentence and a retry, not an empty list.** The rows
 * are fetched when the selection bar appears rather than when this opens, so a
 * failure here is a failed request and not an account with no lists - and rendering
 * it as "you have no other lists" would tell the reader to go and make one, which is
 * advice for a situation they are not in. The empty state and the failure state are
 * therefore different sentences on screen at the same moment.
 *
 * This component performs nothing. It reports a list and a mode and the caller does
 * the request, which is what lets `ListSheet` keep owning every gift mutation and
 * leaves this a list of rows and two buttons.
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
  pendingMode,
  onTransfer,
}) => {
  /*
    The chosen destination, which is local and therefore free - selecting a row is
    never a request. It is a `string | null` rather than an index so that reordering
    or re-fetching the list cannot make a selection point at a different list than
    the one the reader picked.
  */
  const [targetId, setTargetId] = useState<string | null>(null);

  /*
    Cleared when the sheet closes, not on open. A reader who opens the picker for a
    second batch would otherwise find the previous destination still chosen - and
    * for the common case of filing two batches into the same list that is a helpful
    * shortcut, while for a reader who means to file into a *different* list it is a
    control that starts out wrong. Clearing on close keeps the sheet honest: it opens
    with nothing chosen, every time.

    It is also cleared whenever the list of rows changes underneath it, because a
    selection of a list that is no longer offered would commit against an id the
    reader can no longer see.
  */
  const close = () => {
    setTargetId(null);
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
            The prefetch is still in flight. The spec starts it when the selection bar
            appears rather than when this opens, which is what makes the dialog fast
            - but "fast" is not "already finished", and a reader who taps the button
            the instant the bar appears lands here. The alternative was the empty
            state, which says they have no other lists, and that is not a fact this
            dialog knows.
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
          <ul
            className='flex flex-col divide-y divide-rule'
            data-testid='transferTargetList'
          >
            {lists.map((list) => {
              const isChosen = targetId === list.id;

              return (
                <li key={list.id}>
                  {/*
                    A radio, not a row with a click handler. The reader is choosing
                    one destination out of several and then one of two verbs, and a
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
                      onChange={() => setTargetId(list.id)}
                      disabled={pendingMode !== null}
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
            Both buttons are disabled until a destination is chosen, and both are
            shown rather than only the applicable one. Which verb applies is decided
            by whether a row is selected, so a dialog with nothing selected has no
            verb to offer - and hiding the pair until then would make the sheet's
            height jump the moment a row is tapped, which is worse than two plainly
            inert buttons.

            `pendingMode` rather than a boolean, and the reason is on the next line:
            each button swaps to its own progress wording, so the state has to say
            which one was pressed. A single `isPending` would put "moving…" on the
            copy button as well, telling a reader who pressed *Copy here* that the
            wish is being moved - which is the one sentence about this feature that
            would be a lie.
          */}
          <Button
            type='button'
            variant='outline'
            disabled={targetId === null || pendingMode !== null}
            onClick={() => targetId && onTransfer(targetId, 'copy')}
            className='xs:w-full'
            data-testid='transferCopyHere'
          >
            {pendingMode === 'copy'
              ? dict.transferDialog.copying
              : dict.transferDialog.copyHere}
          </Button>

          <Button
            type='button'
            disabled={targetId === null || pendingMode !== null}
            onClick={() => targetId && onTransfer(targetId, 'move')}
            className='xs:w-full'
            data-testid='transferMoveHere'
          >
            {pendingMode === 'move'
              ? dict.transferDialog.moving
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