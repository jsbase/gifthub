'use client';

import React, { useCallback, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { IconArrowLeft, IconCirclePlus, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CropMarks } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/confirm-dialog';
import GiftCard from '@/components/gift-card';
import Footer from '@/components/footer';
import Header from '@/components/header';
import { ListVisibilityDialog } from '@/components/share-list-dialog';
import { isRefusal } from '@/lib/refusals';
import { cn } from '@/lib/utils';
import { memberInkStyle } from '@/lib/member-ink';
import { giftCountLabel, sheetCounts, splitSheet } from '@/lib/gift-count';
import type {
  Gift,
  HeaderProps,
  ListSheetProps,
  ListVisibility,
  Translations,
} from '@/types';

/**
 * The board, the sheet it holds, and the two pieces of furniture around them.
 *
 * This is the figure/ground both signed-in routes are drawn in, and it lives in
 * one place because it was written twice before it lived once: the contents page
 * and the sheet of one list are the same desk with a different piece of paper on
 * it, and the reasoning below is about the desk, not about either sheet.
 *
 *   THE DESK AND THE SHEET. The board is the album lying open, and the contents
 *   are a sheet of label stock mounted on it: the sheet is bounded by a printed
 *   rule and sits inset from every edge, so the board shows around it on all
 *   four sides. That figure/ground pair is what these routes were missing. Bare
 *   rows printed straight onto the board left the empty board below them reading
 *   as a page whose contents had run out; the same rows on a sheet read as what
 *   they are - a short contents list on a piece of paper lying on a desk, with
 *   the desk visible around the paper.
 *
 *   The sheet is not stretched. It hugs its contents, because a sheet sized to
 *   the window would be a panel, and a panel with three rows in it is the same
 *   unfinished screen with a border drawn round it. The board between the sheet
 *   and the footer is the rest of the desk, and the footer sits at the foot of
 *   it.
 *
 *   On a phone this figure/ground inverts, and it inverts because the dialog
 *   already said it would: below `sm` a sheet "becomes the whole page below the
 *   header, squared at the top: a sheet pulled out of an album, not a card
 *   floating on one" (`ui/dialog.tsx:106`). A dialog opens on top of this sheet
 *   edge to edge - the create-list sheet and the share sheet both do - and this
 *   sheet was inset 32px, so the two surfaces the user sees at the same moment
 *   were 32px apart. Below `sm` there is no desk around the paper: the paper is
 *   the page. The rule disappears on that edge for the same reason its corners
 *   do: a border marks a cut edge, and this edge is not cut, it runs off the
 *   screen.
 *
 * The header is passed in rather than built here, because it is the one piece of
 * this frame whose contents depend on the page: `HeaderProps` is in `types.ts`
 * and its `dict` is already the narrow `Pick` it wants, so the route assembles
 * its own header and the frame has no opinion about the person signed in.
 */
export const SheetFrame: React.FC<{
  header: HeaderProps;
  dict: Translations;
  children: ReactNode;
}> = ({ header, dict, children }) => (
  <div className={cn('min-h-screen', 'bg-board', 'flex flex-col')}>
    <Header {...header} />

    <main className={cn('flex', 'flex-1', 'flex-col')}>
      <section className={cn('flex-1', 'bg-board')}>
        <div className={cn('container', 'mx-auto')}>
          <div
            className={cn(
              'mx-auto',
              'max-w-5xl',
              // No `px-4` here. It sat on top of the `container`'s own 1rem, so
              // the sheet's left edge landed 32px from the screen while the
              // header wordmark sat at 16px - the same "padding the padding" the
              // landing page had already removed. From `sm` up the inset returns:
              // a mounted sheet belongs on the desk, not under the phone's
              // bezel. Below `sm` there is no board above the sheet either:
              // `py-0` puts its top edge on the header's bottom rule and `pb-0`
              // puts the desk back immediately under its foot. A 32px margin on
              // a 375px screen is 8% of the width, and on a sheet that is now the
              // page, it is a margin to nowhere.
              'py-0',
              'sm:px-6',
              'sm:py-12'
            )}
          >
            <div
              className={cn(
                'relative',
                'border',
                'border-rule',
                'bg-sheet',
                // Below `sm` this sheet is the whole page, exactly like the
                // dialogs that open on top of it. `-mx-4` pulls it back over the
                // container's 1rem, so the border lands on the viewport edge and
                // the crop marks come to rest 12px from it - registration marks
                // near the paper edge, which is what they are for. `px-4` matches
                // the dialog's `xs:p-4`, so both sheets indent their content by
                // the same 16px.
                '-mx-4',
                // No rule at all below `sm`, on any of the four edges. With no
                // gap above, the top border would land on the header's `border-b`
                // and two 1px rules would read as one thick one; the foot is the
                // same collision, because on a 375x667 screen a short sheet ends
                // exactly on the footer's `border-t`. Left and right are simply
                // at the viewport edge, where a rule has nothing to enclose. A
                // border marks a cut edge of the paper, and on a phone none of
                // these four is cut - they all run off the screen or into the
                // furniture around it. `bg-sheet` against `bg-board` carries the
                // extent instead, in both themes.
                'rounded-none',
                'border-0',
                'px-4',
                'py-6',
                'sm:mx-0',
                'sm:rounded-lg',
                'sm:border',
                // `rounded-lg`, not `rounded-sheet`. globals.css:146 exposes
                // `--radius-lg: var(--radius-sheet)`, and Tailwind only emits a
                // utility for a token declared in `@theme`. `--radius-sheet`
                // lives in `:root`, so `rounded-sheet` is not a class that exists
                // - it compiles to nothing and the sheet stayed square at every
                // width, while the dialog beside it (ui/dialog.tsx:146) got its
                // documented 6px. One sheet, one radius.
                'sm:rounded-lg',
                // The same floor the dialog primitive gives every sheet on a
                // phone, for the same reason. A dialog that opens on top of this
                // is the whole page below the header, so this sheet - which is a
                // page, not a card, below `sm` - ends at the foot of the screen
                // rather than wherever its last row happens to stop. It used to
                // hug its contents, and at 375x667 with three rows that put the
                // third row's rule under the fold: the sheet looked truncated
                // rather than scrollable, and there was no way to tell those two
                // apart except by scrolling and finding out.
                //
                // `100dvh`, not `100vh`: on a phone the two differ by the
                // browser's own chrome, and `100vh` is the taller of them, so a
                // sheet measured in `vh` is taller than the page it is the page
                // of - which reintroduces the same clipped foot, one browser bar
                // lower.
                'min-h-[calc(100dvh-var(--header-height)-1px)]',
                'sm:min-h-0',
                'sm:px-8',
                'sm:py-7'
              )}
            >
              {/* The same corner furniture the floating sheets carry: four
                  printers' crop marks, and the only thing on this page that says
                  "printed" rather than "styled". */}
              <CropMarks />
              {children}
            </div>
          </div>
        </div>
      </section>
    </main>

    <Footer dict={dict} />
  </div>
);

/**
 * The section head: a printed label, a rule, and the count. This is the furniture
 * that turns a list of rows into a page of an album.
 *
 * At module scope, not inside the sheet, for the reason it used to be moved
 * there: as a nested component it was remounted on every render of the sheet,
 * which React flagged, and it is fixed furniture anyway - no state, and it reads
 * only its props.
 */
const SectionHead: React.FC<{ label: string; count: number }> = ({
  label,
  count,
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
 * One sheet of the album: one person's list, its cells divided into the ones
 * still waiting and the ones already stamped.
 *
 * It was a dialog opened from the contents page and it is a route now, which
 * changes two things and not the sheet itself. A list has a URL, so a buyer can
 * be sent one and so this sheet survives a reload; and the owner's controls are
 * on a page rather than behind a trigger, so the sheet opens with the person's
 * own list in front of them instead of appearing over a list of names.
 *
 * **Who may do what is read, not guessed.** `isOwner` decides the whole
 * owner-only surface at once: the add control, the add form, the delete on every
 * cell, the audience below the ideas, and the three controls in the head. An
 * invited account is not shown any of it greyed out - a buyer looking at an
 * owner-only toolbar full of inert buttons cannot tell whether the app is broken
 * or the rule is deliberate - so it is shown none of it, and
 * `listSheet.youAreABuyer` says in words what the missing controls imply.
 *
 * The mark is the one exception, and it is not an exception to the rule above: a
 * buyer may both set and clear any mark, so every mark on a list they can read is
 * live. The asymmetry is on the other side, and it is the reason
 * `Gift.canClear` exists at all.
 *
 * `purchasedById` never leaves the server - it must not, or the person who bought
 * the present gets named on the list it was bought from and the surprise stops
 * existing - so this component cannot work out whose mark it is looking at. The
 * only formula available client-side was "an owner may not clear any mark", which
 * is the safe direction and also quietly wrong: it forbade an owner undoing "I
 * already bought this myself" while `lib/list-access.ts` would have allowed it.
 * Two implementations of one rule is how an interface and a permission model drift
 * apart without either being wrong on its own.
 *
 * So the server sends the answer rather than the fact it was derived from -
 * `mayClearMark` asks *may I* and answers, and never *who did* and who. One
 * boolean carrying no name and no id. When it is false the owner is shown a bought
 * idea as a fact - inverted, in their own ink, with the mark as a stamp rather than
 * a button - and `markedBySomeoneElse` states it.
 *
 * **The prop surface splits the work, and the split is in `types.ts`.** Gift
 * mutations are performed here and reported - `onGiftAdded`, `onGiftChanged` and
 * `onGiftDeleted` carry no arguments, so the page cannot be the one sending them
 * - while `onDeleteList` and `onShareList` report an intent the page acts on.
 * A cascade that destroys every idea on the sheet belongs to the page that has to
 * say something afterwards; the gift is one cell.
 */
const ListSheet: React.FC<ListSheetProps> = ({
  list,
  gifts,
  access,
  isOwner,
  dict,
  onClose,
  onGiftAdded,
  onGiftChanged,
  onGiftDeleted,
  onDeleteList,
  onShareList,
  onVisibilityChanged,
}) => {
  const [showAddGiftForm, setShowAddGiftForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  /* The row whose toggle is in flight, and the row that actually changed. They
     are separate because the settle is a one-shot: gating it on the request
     alone would either replay on every visit or never fire. */
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [changedId, setChangedId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Gift | null>(null);
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);

  /*
    Newest first within each section, because that is the order the API returns
    and because the idea you have just written down is the one you most want to
    see. What changes is which section it is in. Both the split and the count
    come from `lib/gift-count`, which is also what words them - the ladder used
    to be written out a second time here, and two copies of the rule that
    separates "nothing left" from "no ideas at all" is how they came to disagree.
  */
  const { open: openGifts, collected: collectedGifts } = useMemo(
    () => splitSheet(gifts),
    [gifts]
  );
  const sheetTotals = useMemo(() => sheetCounts(gifts), [gifts]);

  /* The count in the sheet's head. It moves whenever a cell is collected, and the
     numeral flashes - the only place the app reports a change outside the cell
     itself, because on a phone the head is the one thing that stays on screen
     while you scroll the cells. */
  const countLabel = giftCountLabel(sheetTotals, {
    giftCount: dict.giftCount,
  });

  const handleAddGift = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsAdding(true);

      const formData = new FormData(e.currentTarget);

      try {
        const response = await fetch(`/api/lists/${list.id}/gifts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: String(formData.get('title') ?? ''),
            description: String(formData.get('description') ?? ''),
            url: String(formData.get('url') ?? ''),
          }),
        });

        if (!response.ok) throw new Error('Failed to add gift');

        toast.success(dict.toasts.giftAdded);
        setShowAddGiftForm(false);
        (e.target as HTMLFormElement).reset();
        onGiftAdded();
      } catch {
        toast.error(dict.toasts.giftAddFailed);
      } finally {
        setIsAdding(false);
      }
    },
    [dict.toasts.giftAddFailed, dict.toasts.giftAdded, list.id, onGiftAdded]
  );

  const handleTogglePurchased = useCallback(
    async (giftId: string) => {
      try {
        setTogglingId(giftId);
        const response = await fetch(
          `/api/lists/${list.id}/gifts/${giftId}/toggle`,
          { method: 'POST' }
        );

        /*
          The toggle answers with the whole cell rather than a flag, because a
          client that reads only `isPurchased` off it would be guessing at the
          state of a sheet it is about to be told about anyway. So this is read
          for one thing only: which of the two sentences the person is about to
          hear is the true one.
        */
        const body = (await response.json().catch(() => null)) as {
          gift?: { isPurchased?: boolean };
          code?: unknown;
        } | null;

        /*
          `cannot_clear_purchase` is the one refusal with a sentence worth
          showing, and it is the only one the mark can produce. The interface is
          built so a reader never reaches it - a buyer may clear anybody's mark,
          and an owner is not offered a control on a bought idea - so a refusal
          here means the server and the interface disagree about whose mark this
          is, and the server is right. It is worth a sentence rather than the
          generic "could not update", which would be true of every failure and
          explains none of them.
        */
        if (isRefusal(body?.code) && body.code === 'cannot_clear_purchase') {
          toast.error(dict.errors.cannotClearPurchase);
          return;
        }

        if (!response.ok) throw new Error('Failed to update gift status');

        toast.success(
          body?.gift?.isPurchased
            ? dict.toasts.giftStatusPurchased
            : dict.toasts.giftStatusBackToList
        );
        setChangedId(giftId);
        onGiftChanged();
      } catch {
        toast.error(dict.toasts.giftStatusUpdateFailed);
      } finally {
        setTogglingId(null);
      }
    },
    [
      dict.errors.cannotClearPurchase,
      dict.toasts.giftStatusBackToList,
      dict.toasts.giftStatusPurchased,
      dict.toasts.giftStatusUpdateFailed,
      list.id,
      onGiftChanged,
    ]
  );

  const handleDeleteGift = useCallback(
    async (giftId: string) => {
      try {
        const response = await fetch(`/api/lists/${list.id}/gifts/${giftId}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete gift');

        toast.success(dict.toasts.giftDeleted);
        onGiftDeleted();
      } catch {
        toast.error(dict.toasts.giftDeleteFailed);
      }
    },
    [dict.toasts.giftDeleteFailed, dict.toasts.giftDeleted, list.id, onGiftDeleted]
  );

  const handleConfirmDelete = useCallback(() => {
    if (pendingDeletion) handleDeleteGift(pendingDeletion.id);
  }, [pendingDeletion, handleDeleteGift]);

  const handleVisibilitySelected = useCallback(
    async (visibility: ListVisibility) => {
      try {
        const response = await fetch(`/api/lists/${list.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility }),
        });

        if (!response.ok) throw new Error('Failed to change visibility');

        toast.success(dict.toasts.visibilityChanged);
        setIsVisibilityOpen(false);
        onVisibilityChanged();
      } catch {
        toast.error(dict.toasts.visibilityChangeFailed);
      }
    },
    [
      dict.toasts.visibilityChangeFailed,
      dict.toasts.visibilityChanged,
      list.id,
      onVisibilityChanged,
    ]
  );

  const isShared = list.visibility === 'SHARED';
  const canAdd = isOwner;

  return (
    /*
      The owner's ink, set once for the whole sheet and inherited down through
      the cells rather than written onto each one. It is the **owner's** ink, not
      this list's: keyed on the id it is given, and what it is given is
      `list.ownerId`, so every sheet a person owns carries the same pen and the
      colour does not move when the sheet is renamed or republished.
    */
    <div className='flex flex-col gap-5' style={memberInkStyle(list.ownerId)}>
      <div className='flex flex-col gap-4'>
        {/*
          The way back, printed above the sheet rather than inside its head: it
          belongs to the page it is leaving, and the sheet's own first line should
          be the name of the list.
        */}
        <Button
          variant='ghost'
          onClick={onClose}
          data-testid='backToLists'
          className={cn('-ml-2', 'w-fit', 'justify-start', 'gap-2', 'px-2', 'text-caption')}
        >
          <IconArrowLeft className='h-4 w-4' aria-hidden='true' />
          {dict.listSheet.backToLists}
        </Button>

        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6'>
          <div className='flex min-w-0 flex-col gap-2'>
            {/*
              The list's own name, in the specimen serif. A list name is a name -
              the same voice as the wordmark and as the person's own name in the
              header - and this is the only serif on the route.
            */}
            <h1
              data-testid='listName'
              className={cn(
                'font-serif',
                'text-2xl',
                'font-semibold',
                'leading-tight',
                'tracking-[-0.01em]',
                'text-ink'
              )}
            >
              {list.name}
            </h1>

            {/*
              One sentence under the name, and which sentence depends on who is
              reading. The owner gets what the sheet is for; an invited account
              gets the one thing it can do that the owner cannot do for them,
              because otherwise a buyer has to guess whether the missing controls
              are missing on purpose - and `PRODUCT.md` treats a control a reader
              cannot use as a question the product has to answer in words.
            */}
            <p
              data-testid={isOwner ? 'listHint' : 'youAreABuyer'}
              className={cn(
                'max-w-[44ch]',
                'text-[0.9375rem]',
                'leading-relaxed',
                'text-pretty',
                'text-caption'
              )}
            >
              {isOwner ? dict.listSheet.listHint : dict.listSheet.youAreABuyer}
            </p>

            {/*
              How far this list reaches, for everybody, in words: the state the
              owner chose and the consequence of having chosen it. It is printed
              rather than signalled by a colour or a tick, and it is on the sheet
              rather than only on the contents page because a buyer who arrived
              here needs to know that this is a list somebody deliberately opened
              to them - and an owner needs it beside the control that closes it.
            */}
            <p className='flex flex-wrap items-center gap-x-3 gap-y-1'>
              <span className='label-print text-caption'>
                {isShared ? dict.visibility.shared : dict.visibility.private}
              </span>
              <span
                className='max-w-[44ch] text-[0.8125rem] leading-relaxed text-caption'
                data-testid='visibilityHint'
              >
                {isShared
                  ? dict.visibility.sharedHint
                  : dict.visibility.privateHint}
              </span>
            </p>
          </div>

          {/*
            The owner's three controls, and nobody else's. They wrap below `sm`
            because two long German or Russian labels do not fit on one line at
            390px, and `deleteList` is last rather than red, because a row of
            three buttons on a sheet nobody has asked to destroy anything on yet
            should not announce that something can be.

            `visibility.change` opens a chooser and is not a switch between the
            two states: "private" and "shared" are alternatives with consequences,
            and a two-position switch is the one control shape that cannot say
            which is which before it is pressed. The contents page row opens the
            same chooser - one control for one decision, in both places.
          */}
          {isOwner && (
            <div className='flex shrink-0 flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                onClick={() => setIsVisibilityOpen(true)}
                data-testid='sheetChangeVisibility'
                className='text-[0.875rem]'
              >
                {dict.visibility.change}
              </Button>

              <Button
                variant='outline'
                onClick={onShareList}
                data-testid='sheetShareList'
                className='text-[0.875rem]'
              >
                {dict.listBoard.share}
              </Button>

              {/*
                Ghost and destructive-on-hover, not a red outline: the destructive
                treatment belongs to the confirmation that follows it, which
                states the cascade and the irreversibility in words.
              */}
              <Button
                variant='ghost'
                onClick={onDeleteList}
                data-testid='sheetDeleteList'
                className={cn(
                  'text-[0.875rem]',
                  'text-destructive',
                  '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-destructive',
                  '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink-foreground'
                )}
              >
                <IconTrash className='h-4 w-4' aria-hidden='true' />
                {dict.listBoard.deleteList}
              </Button>
            </div>
          )}
        </div>
      </div>

      {!showAddGiftForm && (
        <>
          {/*
            The count is the sheet's own line of state, in the same words the
            contents page uses. It is a flash rather than a change of wording
            because the wording does not change: the number inside it does. With
            no gifts there is nothing to count, so the line is omitted entirely -
            the empty state below carries the message.
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
            canAdd ? (
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

                It is rendered only for a reader who may add. A buyer on an empty
                list gets the sentence below instead: a dashed plate on a sheet
                nobody can write on would be an invitation with no action behind
                it, which is the same defect as a disabled control.
              */
              <div className='flex flex-col gap-1'>
                <section className='flex flex-col gap-3'>
                  <SectionHead label={dict.listSheet.openIdeas} count={0} />
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
                    {/* The field's own name, in the face the section heads use,
                        so the blank cell reads as one cell of this sheet rather
                        than as a message about the sheet. */}
                    <span className={cn('label-print', 'text-caption')}>
                      {dict.listSheet.enterGiftTitle}
                    </span>

                    {/* The invitation, in ink rather than in caption. On a sheet
                        with nothing on it this sentence is the entire content,
                        and it was set at the same weight as the section head
                        above it. */}
                    <span
                      data-testid='noGifts'
                      className={cn(
                        'text-[0.9375rem]',
                        'leading-relaxed',
                        'text-pretty',
                        'text-ink'
                      )}
                    >
                      {dict.listSheet.noGifts}
                    </span>

                    {/* What actually goes in. Hidden from assistive tech because
                        it restates what the form it opens will label field by
                        field, and a fourth sentence in the button's accessible
                        name is more than the control needs to announce. */}
                    <span
                      aria-hidden='true'
                      className={cn(
                        'text-[0.8125rem]',
                        'leading-relaxed',
                        'text-caption'
                      )}
                    >
                      {dict.listSheet.emptyCellHint}
                    </span>
                  </button>
                </section>
              </div>
            ) : (
              /*
                Somebody else's empty list. The one thing worth saying is that
                there is nothing on it yet - and `giftCount.none` is exactly that
                sentence, and is the same one the contents page prints for a list
                with no ideas at all. It is deliberately *not* `giftCount.zero`:
                "nothing left to buy" would be a claim about a list that has
                never had anything on it.

                No dashed plate around it. A dashed rule means there is room for a
                cell, and the only thing anybody can do with room for a cell is
                write in it - which this reader cannot do, so the rule would be
                advertising an action the interface is not offering. The plate on
                the owner's empty sheet is dashed *and* is the button; a buyer gets
                the sentence alone.
              */
              <div className='flex flex-col gap-1'>
                <section className='flex flex-col gap-3'>
                  <SectionHead label={dict.listSheet.openIdeas} count={0} />
                  <p
                    data-testid='noGifts'
                    className={cn(
                      'max-w-[44ch]',
                      'text-[0.9375rem]',
                      'leading-relaxed',
                      'text-pretty',
                      'text-caption'
                    )}
                  >
                    {dict.giftCount.none}
                  </p>
                </section>
              </div>
            )
          ) : (
            <div className='flex flex-col gap-1'>
              {openGifts.length > 0 && (
                <section className='flex flex-col gap-3'>
                  <SectionHead
                    label={dict.listSheet.openIdeas}
                    count={openGifts.length}
                  />
                  <ul className='flex flex-col gap-2'>
                    {openGifts.map((gift) => (
                      <GiftCard
                        key={gift.id}
                        gift={gift}
                        dict={dict.listSheet}
                        canAdd={canAdd}
                        canDelete={isOwner}
                        // The mark is the one control that is never simply
                        // present: an owner may put a mark on but may not take one
                        // off, so on an open idea - which nobody has marked - the
                        // owner clears it and everybody can.
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
                    The section head says what the section is, not what it means:
                    the line above already says "nothing left to buy" in the
                    product's own words, so saying it twice here would be two
                    sentences competing for the same fact.
                  */}
                  <SectionHead
                    label={dict.listSheet.collectedIdeas}
                    count={collectedGifts.length}
                  />

                  {/*
                    `markedBySomeoneElse` is one sentence and it is put here, once,
                    rather than repeated on every collected cell - a sheet with
                    twenty of them would say it twenty times, and a reader needs
                    to know the rule before reading the section, not on every
                    stamp in it. It appears only for the owner: an invited account
                    may clear anybody's mark, so every mark on a list they can
                    read is theirs to undo and there is nothing to explain.

                    It cannot be rendered inside the cell: `GiftCardProps.dict` is
                    narrowed to three keys and `types.ts` is frozen, so the note
                    is attached to the section from here.
                  */}
                  {isOwner && (
                    <p
                      data-testid='markedBySomeoneElse'
                      className={cn(
                        'max-w-[54ch]',
                        '-mt-1',
                        'text-[0.8125rem]',
                        'leading-relaxed',
                        'text-pretty',
                        'text-caption'
                      )}
                    >
                      {dict.listSheet.markedBySomeoneElse}
                    </p>
                  )}

                  <ul className='flex flex-col gap-2'>
                    {collectedGifts.map((gift) => (
                      <GiftCard
                        key={gift.id}
                        gift={gift}
                        dict={dict.listSheet}
                        canAdd={canAdd}
                        canDelete={isOwner}
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
            The add action is at the foot of the sheet and it is quiet. It was a
            solid ink button at the head of the list, where it outweighed the
            person's own name - the loudest thing on a page should be the thing
            the page is about, and the page is about their ideas.

            It is the foot row only once the sheet has something on it, and only
            for a reader who may add. On an empty sheet the blank cell is the add
            control, and leaving a second one here would be two controls
            performing one action; for a buyer it would be an invitation to
            perform an action the server refuses.
          */}
          {gifts.length > 0 && canAdd && (
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
                {/* `stroke`, not `strokeWidth`: Tabler reads `stroke` as the
                    stroke width. 1.75 on a 16px icon, carried over from the
                    member sheet so the icon is the same object it was. */}
                <IconCirclePlus className='h-4 w-4' stroke={1.75} aria-hidden='true' />
                <span className='label-print'>{dict.listSheet.addGift}</span>
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
          {/* Visible printed labels above each field. The previous version
              relied on placeholders with screen-reader-only labels, which is a
              known weak pattern: the instruction disappears the moment the field
              is filled and a screen reader meets it only once. */}
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='title' className='label-print text-caption'>
              {dict.listSheet.enterGiftTitle}
            </Label>
            <Input
              id='title'
              name='title'
              placeholder={dict.listSheet.enterGiftTitle}
              required
              autoFocus
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='description' className='label-print text-caption'>
              {dict.listSheet.enterDescription}
            </Label>
            <Textarea
              id='description'
              name='description'
              placeholder={`${dict.listSheet.enterDescription} (${dict.listSheet.optional})`}
              rows={3}
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='url' className='label-print text-caption'>
              {dict.listSheet.enterUrl}
            </Label>
            <Input
              id='url'
              name='url'
              type='url'
              placeholder={`${dict.listSheet.enterUrl} (${dict.listSheet.optional})`}
            />
          </div>

          <div className='mt-1 flex flex-row gap-2 xs:flex-col xs:gap-1.5'>
            <Button
              type='submit'
              disabled={isAdding}
              className='xs:w-full'
              data-testid='addGiftSubmit'
            >
              {isAdding ? dict.listSheet.adding : dict.listSheet.addGift}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowAddGiftForm(false)}
              className='xs:w-full'
            >
              {dict.listSheet.cancel}
            </Button>
          </div>
        </form>
      )}

      {/*
        Who this list is shared with, and only for the reader who chose them. An
        invited account is not shown the audience: `accessForList` refuses it, so
        there is nothing to show even if the client asked, and a buyer who knows
        the names of the other people buying from this list is a different product
        from the one this is.

        The rows are names and addresses with no control on them. Withdrawing is
        in the share sheet, which is where the owner's own three controls are and
        where a confirmation can state what is being withdrawn.
      */}
      {isOwner && (
        <section className='mt-2 flex flex-col gap-2'>
          <SectionHead
            label={
              access.length > 0
                ? dict.visibility.sharedWith
                : dict.visibility.sharedWithNobody
            }
            count={access.length}
          />

          {access.length === 0 ? (
            <p
              className='max-w-[44ch] text-[0.8125rem] leading-relaxed text-caption'
              data-testid='nobodyYet'
            >
              {dict.shareList.nobodyYet}
            </p>
          ) : (
            <ul
              data-testid='accessList'
              className='divide-y divide-rule border-y border-rule'
            >
              {access.map((row) => (
                <li
                  key={row.id}
                  className='flex min-w-0 flex-col gap-0.5 py-2'
                >
                  <span className='break-words text-[0.9375rem] text-ink'>
                    {row.displayName}
                  </span>
                  <span className='min-w-0 truncate text-[0.8125rem] text-caption'>
                    {row.email}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ListVisibilityDialog
        isOpen={isVisibilityOpen}
        onClose={() => setIsVisibilityOpen(false)}
        visibility={list.visibility}
        dict={dict}
        onSelect={handleVisibilitySelected}
      />

      {/*
        The one destructive action on a cell, and the only one a buyer cannot
        reach - so for a buyer this dialog is unreachable, which is why the
        control that opens it is not rendered at all rather than rendered inert.

        The confirmation says what deleting an idea does to everybody this list is
        shared with, because that is the part of the consequence the person
        pressing the button is not thinking about: it is not only off their list.
      */}
      <ConfirmDialog
        isOpen={pendingDeletion !== null}
        onClose={() => setPendingDeletion(null)}
        onConfirm={handleConfirmDelete}
        title={dict.listSheet.deleteGiftConfirm}
        description={dict.confirmations.deleteGift}
        confirmLabel={dict.listSheet.deleteGift}
        cancelLabel={dict.listSheet.cancel}
      />
    </div>
  );
};

export default ListSheet;