'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { IconCirclePlus } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import GiftCard from '@/components/gift-card';
import ConfirmDialog from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import { memberInkStyle } from '@/lib/member-ink';
import { giftCountLabel, sheetCounts, splitSheet } from '@/lib/gift-count';
import type { MemberGiftsDialogProps, Gift } from '@/types';

/**
 * The section head: a printed label, a rule, and the count. This is the
 * furniture that turns a list of rows into a page of an album.
 *
 * At module scope, not inside the dialog. As a nested component it was
 * remounted on every render of the sheet, which React flagged, and it is a
 * fixed piece of furniture anyway - it has no state and reads only its props.
 */
const SectionHead = ({
  label,
  count,
}: {
  label: string;
  count: number;
}) => (
  <div className='flex items-baseline justify-between gap-3 pt-2'>
    <h3 className='label-print text-caption'>{label}</h3>
    <span
      className={cn(
        'font-label',
        'text-[0.6875rem]',
        'font-bold',
        'tabular-nums',
        'tracking-[0.1em]',
        'text-caption'
      )}
    >
      {String(count).padStart(2, '0')}
    </span>
  </div>
);

/**
 * One sheet of the album: a person's page, its cells divided into the ones still
 * waiting and the ones already stamped.
 *
 * The previous version returned the gifts newest-first in a single run of rows,
 * which meant the two states this product exists to distinguish - still needed
 * and already covered - were interleaved in whatever order they happened to be
 * written. Splitting the sheet is not decoration: "what does this person still
 * need" and "what has been handled" are different questions, and a single
 * undifferentiated list cannot answer either one. It is also why the collected
 * cells recede: open cells sit on white, collected cells are inverted, so the
 * eye lands on what is still needed without being told to.
 */
const MemberGiftsDialog: React.FC<MemberGiftsDialogProps> = ({
  isOpen,
  onClose,
  memberId,
  memberName,
  gifts,
  onGiftAdded,
  dict,
}) => {
  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  /* The row whose toggle is in flight, and the row that actually changed. They
     are separate because the settle is a one-shot: gating it on the request
     alone would either replay on every dialog open or never fire. */
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [changedId, setChangedId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Gift | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowAddGiftForm(false);
      setIsLoading(false);
      setTogglingId(null);
      setChangedId(null);
      setPendingDeletion(null);
    }
  }, [isOpen]);

  /*
    Newest first within each section, because that is the order the API returns
    and because the idea you have just written down is the one you most want to
    see. What changes is which section it is in. Both the split and the count
    come from `lib/gift-count`, which is also what words them - the ladder used
    to be written out a second time right here, and two copies of the rule that
    separates "nothing left" from "no ideas at all" is how they came to disagree.
  */
  const { open: openGifts, collected: collectedGifts } = useMemo(
    () => splitSheet(gifts),
    [gifts]
  );
  const sheetTotals = useMemo(() => sheetCounts(gifts), [gifts]);

  /* The count in the sheet's header. It moves whenever a cell is collected, and
     the numeral flashes - the only place the app reports a change outside the
     cell itself, because on mobile the sheet's own header is the one thing that
     stays on screen while you scroll the cells. */
  const countLabel = giftCountLabel(sheetTotals, {
    giftCount: dict.giftCount,
  });

  const handleAddGift = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);

      const formData = new FormData(e.currentTarget);
      const giftData: Omit<Gift, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        url: formData.get('url') as string,
        isPurchased: false,
        groupId: '',
        forMemberId: memberId,
      };

      try {
        const response = await fetch('/api/gifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(giftData),
        });

        if (!response.ok) throw new Error('Failed to add gift');

        toast.success(dict?.toasts.giftAdded);
        setShowAddGiftForm(false);
        onGiftAdded();
        (e.target as HTMLFormElement).reset();
      } catch {
        toast.error(dict?.toasts.giftAddFailed);
      } finally {
        setIsLoading(false);
      }
    },
    [dict?.toasts.giftAdded, dict?.toasts.giftAddFailed, memberId, onGiftAdded]
  );

  const handleTogglePurchased = useCallback(
    async (giftId: string) => {
      try {
        setTogglingId(giftId);
        const response = await fetch(`/api/gifts/${giftId}/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: giftId }),
        });

        if (!response.ok) throw new Error('Failed to update gift status');

        const data = await response.json();
        toast.success(
          data.isPurchased
            ? dict?.toasts.giftStatusPurchased
            : dict?.toasts.giftStatusBackToList
        );
        setChangedId(giftId);
        onGiftAdded();
      } catch {
        toast.error(dict?.toasts.giftStatusUpdateFailed);
      } finally {
        setTogglingId(null);
      }
    },
    [
      dict?.toasts.giftStatusPurchased,
      dict?.toasts.giftStatusBackToList,
      dict?.toasts.giftStatusUpdateFailed,
      onGiftAdded,
    ]
  );

  const handleDeleteGift = useCallback(
    async (giftId: string) => {
      try {
        const response = await fetch(`/api/gifts/${giftId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete gift');
        }

        toast.success(dict?.toasts.giftDeleted);
        onGiftAdded();
      } catch {
        toast.error(dict?.toasts.giftDeleteFailed);
      }
    },
    [
      dict?.toasts.giftDeleted,
      dict?.toasts.giftDeleteFailed,
      onGiftAdded,
    ]
  );

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeletion) {
      handleDeleteGift(pendingDeletion.id);
    }
  }, [pendingDeletion, handleDeleteGift]);

  if (!mounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        closeLabel={dict.close}
        className='sm:max-w-sheet'
        style={memberInkStyle(memberId)}
      >
        <DialogHeader>
          {/*
            The one dialog title that is a name, so the one dialog title in the
            specimen serif. A person's name is the content the serif is reserved
            for, and it is now the printed label's proper voice.
          */}
          <DialogTitle>{memberName}</DialogTitle>
          <DialogDescription>{dict.listHint}</DialogDescription>
        </DialogHeader>

        {!showAddGiftForm && (
          <>
            {/*
              The count is the sheet's own line of state, in the same words the
              contents page uses. It is a flash rather than a change of wording
              because the wording does not change: the number inside it does.
              With zero gifts there is nothing to count, so the line is omitted
              entirely — the empty-state paragraph below carries the message.
            */}
            {gifts.length > 0 && (
              <div
                key={countLabel}
                className={cn(
                  'animate-count-flash',
                  '-mx-1',
                  'w-fit',
                  'rounded-sm',
                  'px-1',
                  'font-label',
                  'text-[0.6875rem]',
                  'font-bold',
                  'uppercase',
                  'tracking-[0.14em]',
                  'text-caption'
                )}
              >
                {countLabel}
              </div>
            )}

            {gifts.length === 0 ? (
              /*
                A blank page waiting to be written on - and the blank page is the
                button.

                The plate used to be a paragraph and the add action was a quiet
                ghost row pinned to the foot of the sheet underneath it, so the
                one thing a person can do on an empty sheet was the quietest
                object on it, eleven pixels of tracked caption below a rule, and
                the invitation ("add the first one") and the control that carried
                out the invitation were two separate things with a rule between
                them. It also read as a placeholder: a wide dashed rectangle with
                one caption-weight sentence floating in the middle of it is the
                silhouette of a panel that failed to load.

                The dashed plate now IS the control, for the same reason it is
                dashed. A printed rule means there is a cell and a dashed one
                means there is room for one, and the only thing you can do with
                room for a cell is write in it. So the whole cell is the target -
                the full width of a cell rather than a 44px-tall row - the
                invitation and the action are finally the same object, and the
                foot row is gone rather than left as a second control that
                duplicates it.

                It keeps the populated branch's structure exactly: same outer
                `flex flex-col gap-1`, same section, same head, same gaps, so
                writing the first idea moves one sentence into a cell instead of
                moving the head, the plate and the first row. The plate is a
                `<button>` rather than a `<p>`, so it takes the app's one focus
                mechanism and one Tab stop instead of none.
              */
              <div className='flex flex-col gap-1'>
                <section className='flex flex-col gap-3'>
                  <SectionHead label={dict.openIdeas} count={0} />
                  <button
                    type='button'
                    onClick={() => setShowAddGiftForm(true)}
                    data-testid='addGiftButton'
                    className={cn(
                      // Full content width, because a cell on this sheet is
                      // always full content width: a blank cell that stops two
                      // thirds of the way across would be a different shape from
                      // the cell it is standing in for.
                      'group flex w-full flex-col items-start gap-2.5',
                      'border',
                      'border-dashed',
                      'border-rule',
                      'px-5',
                      'py-7',
                      'text-left',
                      // The wash is a real hover affordance on a control, so it
                      // is gated on a real pointer. A touch device that can
                      // reach a button cannot hover it, and an unhoverable target
                      // that repaints on tap is the tap-to-nothing pattern.
                      '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash',
                      'rounded-md'
                    )}
                  >
                    {/*
                      The field's own name, in the face the section heads use, so
                      the blank cell reads as one cell of this sheet rather than as
                      a message about the sheet.
                    */}
                    <span className={cn('label-print', 'text-caption')}>
                      {dict.enterGiftTitle}
                    </span>

                    {/*
                      The invitation, in ink rather than in caption. On a sheet
                      with nothing on it this sentence is the entire content, and
                      it was set at the same weight as the section head above it.
                    */}
                    <span
                      data-testid='noGifts'
                      className={cn(
                        'text-[0.9375rem]',
                        'leading-relaxed',
                        'text-pretty',
                        'text-ink'
                      )}
                    >
                      {dict.noGifts}
                    </span>

                    {/*
                      What actually goes in. Hidden from assistive tech because it
                      restates what the form it opens will label field by field,
                      and a fourth sentence in the button's accessible name is
                      more than the control needs to announce.
                    */}
                    <span
                      aria-hidden='true'
                      className={cn(
                        'text-[0.8125rem]',
                        'leading-relaxed',
                        'text-caption'
                      )}
                    >
                      {dict.emptyCellHint}
                    </span>
                  </button>
                </section>
              </div>
            ) : (
              <div className='flex flex-col gap-1'>
                {openGifts.length > 0 && (
                  <section className='flex flex-col gap-3'>
                    <SectionHead
                      label={dict.openIdeas}
                      count={openGifts.length}
                    />
                    <ul className='flex flex-col gap-2'>
                      {openGifts.map((gift) => (
                        <GiftCard
                          key={gift.id}
                          gift={gift}
                          dict={dict}
                          onDelete={(id) =>
                            setPendingDeletion(
                              gifts.find((candidate) => candidate.id === id) ??
                                null
                            )
                          }
                          onTogglePurchased={handleTogglePurchased}
                          togglingId={togglingId}
                          changedId={changedId}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                {collectedGifts.length > 0 && (
                  <section className='flex flex-col gap-3'>
                    {/*
                      The section head says what the section is, not what it
                      means: the line above already says "nothing left to buy" in
                      the product's own words, so saying it twice here would be
                      two sentences competing for the same fact.
                    */}
                    <SectionHead
                      label={dict.collectedIdeas}
                      count={collectedGifts.length}
                    />
                    <ul className='flex flex-col gap-2'>
                      {collectedGifts.map((gift) => (
                        <GiftCard
                          key={gift.id}
                          gift={gift}
                          dict={dict}
                          onDelete={(id) =>
                            setPendingDeletion(
                              gifts.find((candidate) => candidate.id === id) ??
                                null
                            )
                          }
                          onTogglePurchased={handleTogglePurchased}
                          togglingId={togglingId}
                          changedId={changedId}
                        />
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {/*
              The add action is at the foot of the sheet and it is quiet. It was
              a solid ink button at the head of the list, where it outweighed the
              person's own name - the loudest thing on a page should be the thing
              the page is about, and the page is about their ideas.

              It is also the foot row only once the sheet has something on it. On
              an empty sheet the blank cell is the add control, and leaving a
              second one here would be two controls performing one action.
            */}
            {gifts.length > 0 && (
              <div className='mt-1 border-t border-rule pt-3'>
                <Button
                  variant='ghost'
                  onClick={() => setShowAddGiftForm(true)}
                  className={cn(
                    'w-full',
                    'justify-start',
                    'gap-2.5',
                    'px-3',
                    'text-caption'
                  )}
                  data-testid='addGiftButton'
                >
                  {/*
                    `stroke`, not `strokeWidth` - see the same note on the
                    wordmark in `logo.tsx`. Tabler reads `stroke` as the stroke
                    width; `strokeWidth` would still work and still typecheck, by
                    way of the spread order, and would silently win. 1.75 on a
                    16px icon is 1.17px of ink against the 1.33px its neighbours
                    draw, which is a pre-existing inconsistency rather than one
                    this swap introduces; it is carried over verbatim so the
                    migration stays visual-only.
                  */}
                  <IconCirclePlus className='h-4 w-4' stroke={1.75} />
                  <span className='label-print'>{dict.addGift}</span>
                </Button>
              </div>
            )}
          </>
        )}

        {showAddGiftForm && (
          <form
            onSubmit={handleAddGift}
            className='flex flex-col gap-4 xs:gap-3'
          >
            {/*
              Visible printed labels above each field. The previous version
              relied on placeholders with screen-reader-only labels, which is a
              known weak pattern: the instruction disappears the moment the field
              is filled and a screen reader meets it only once.
            */}
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='title' className='label-print text-caption'>
                {dict.enterGiftTitle}
              </Label>
              <Input
                id='title'
                name='title'
                placeholder={dict.enterGiftTitle}
                required
                autoFocus
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='description' className='label-print text-caption'>
                {dict.enterDescription}
              </Label>
              <Textarea
                id='description'
                name='description'
                placeholder={`${dict.enterDescription} (${dict.optional})`}
                rows={3}
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='url' className='label-print text-caption'>
                {dict.enterUrl}
              </Label>
              <Input
                id='url'
                name='url'
                type='url'
                placeholder={`${dict.enterUrl} (${dict.optional})`}
              />
            </div>

            <div className='mt-1 flex flex-row gap-2 xs:flex-col xs:gap-1.5'>
              <Button
                type='submit'
                disabled={isLoading}
                className='xs:w-full'
                data-testid='addGiftSubmit'
              >
                {isLoading ? dict.adding : dict.addGift}
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => setShowAddGiftForm(false)}
                className='xs:w-full'
              >
                {dict.cancel}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>

      <ConfirmDialog
        isOpen={pendingDeletion !== null}
        onClose={() => setPendingDeletion(null)}
        onConfirm={handleConfirmDelete}
        title={dict.deleteGiftConfirm}
        description={dict.confirmations.deleteGift}
        confirmLabel={dict.deleteGift}
        cancelLabel={dict.cancel}
      />
    </Dialog>
  );
};

export default MemberGiftsDialog;
