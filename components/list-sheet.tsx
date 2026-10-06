'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { IconArrowLeft, IconCirclePlus, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CropMarks } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/confirm-dialog';
import GiftCard from '@/components/gift-card';
import TransferDialog from '@/components/transfer-dialog';
import Footer from '@/components/footer';
import Header from '@/components/header';
import { StatusBadge } from '@/components/status-badge';
import { ListVisibilityDialog } from '@/components/share-list-dialog';
import { isRefusal, type Refusal } from '@/lib/refusals';
import { cn } from '@/lib/utils';
import { memberInkStyle } from '@/lib/member-ink';
import {
  giftCountLabel,
  selectedCountLabel,
  sheetCounts,
  splitSheet,
} from '@/lib/gift-count';
import { GIFT_FIELD_LIMITS } from '@/lib/gift-text';
import { getLocaleFromPath } from '@/lib/i18n-config';
import { usePathname } from 'next/navigation';
import type {
  Gift,
  ListSheetProps,
  ListSummary,
  ListVisibility,
  SheetFrameProps,
  Translations,
} from '@/types';

/**
 * A name for one transfer attempt, sent with the request so that pressing the same
 * button again after a lost reply cannot write a copy twice (`transferGifts` has the
 * server half).
 *
 * `crypto.randomUUID` is only defined in a secure context, and the sheet is opened
 * over plain `http` by anybody testing from a phone against a development machine's
 * address - where it is simply absent, and a missing function would fail every
 * transfer with a sentence about the network. The fallback is not secret and does not
 * need to be: the server namespaces the value by account, so all it has to be is
 * different from the last attempt's. Its alphabet is the one the route accepts.
 */
const newRequestId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * The sentence for a transfer the server answered with a refusal.
 *
 * Exhaustive over `Refusal`, like the tables in `account-picker.tsx` and
 * `groups-dialog.tsx`: a code added to the vocabulary does not typecheck here until
 * somebody has decided what a person making a transfer is told. Most of them are the
 * generic sentence, and that is a decision rather than an omission - an
 * `invalid_email` cannot come out of this route, and if one ever did the honest thing
 * to say is that the wishes were not transferred.
 *
 * Only two are specific, and both because the reader can do something about them:
 * `not_found` (a wish or the destination has gone since the sheet loaded) and
 * `too_many_gifts` (select fewer).
 */
const transferFailureText = (dict: Translations, code: unknown): string => {
  const generic = dict.toasts.giftsTransferFailed;
  if (!isRefusal(code)) return generic;

  const table: Record<Refusal, string> = {
    not_found: dict.toasts.giftsTransferNotFound,
    too_many_gifts: dict.toasts.giftsTransferTooMany,
    invalid_email: generic,
    duplicate_email: generic,
    invalid_nickname: generic,
    duplicate_nickname: generic,
    weak_password: generic,
    invalid_display_name: generic,
    invalid_identifier: generic,
    nothing_to_change: generic,
    ambiguous_change: generic,
    invalid_visibility: generic,
    already_on_this_list: generic,
    no_such_account: generic,
    already_shared: generic,
    cannot_share_with_owner: generic,
    not_shared_yet: generic,
    invalid_search_query: generic,
    no_such_group: generic,
    duplicate_group_name: generic,
    cannot_join_own_group: generic,
    forbidden: generic,
    cannot_clear_purchase: generic,
  };

  return table[code];
};

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
 *   floating on one" (as `ui/dialog.tsx` documents). A dialog opens on top of this sheet
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
export const SheetFrame: React.FC<SheetFrameProps> = ({
  header,
  dict,
  children,
}) => (
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
                // width, while the dialog beside it (as `ui/dialog.tsx` documents) got its
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
 * The section head, and the one piece of furniture this product has.
 *
 * **The rule under it is the point.** This head used to carry `pt-2` and no rule,
 * while the identically named head on the contents page carried `border-b
 * border-rule` - same face, same size, same colour, one with a line under it and
 * one without. So nothing on this page said a block had started: the
 * gaps ran 8, 12 and 20px, and the largest of them was between blocks and 2.5x the
 * smallest, which is not a difference anybody can see. "Where does a block begin"
 * had no answer on the sheet.
 *
 * It does now, and the answer is one mark with one meaning. A hairline is a
 * boundary: between blocks, and between content and the controls that act on it.
 * Rows inside a block are separated by nothing but their own padding, because a
 * line between two rows of one section claims they are two sections - which is
 * exactly what `divide-y` was doing to every pair of gift cells, and exactly what
 * it used to do on the contents page between two lists in one section.
 *
 * **The same declaration as `list-board.tsx`'s, in the two things they share.**
 * Two components with the same name, the same face and the same size, one with a
 * rule and one without, taught a reader who had learnt one of them nothing about
 * the other. They agree now on the label - `label-print pt-1 text-caption`, in
 * both - and on the row the label sits in. They differ in where the rule falls,
 * and that difference is a question about their position rather than an
 * inconsistency: a head with a block above it separates itself from that block
 * with a rule above the label, while the contents page's first label has nothing
 * over it and its section head rules itself off from its rows below instead.
 * `list-board.tsx` carries the reasoning on its own side of that.
 *
 * **The rule is above the label, not under it.** It was underneath, and the cells
 * under the head drew their own top border 16px below that - so every block opened
 * with two parallel lines a breath apart and a reader could not tell which of them
 * began the block. Above the label, one line, and `pt-3` puts the label 12px under
 * its own rule against 16px to the first row: the rule belongs to the heading it
 * introduces, which is the only relationship it can have. `DESIGN.md` prints the
 * same shape - `top-plate-and-rule`, a 1px line, then `DEINE LISTEN` 12px under it.
 *
 * `h2`, not `h3`: with the header's display name demoted from an `h1` to a
 * paragraph, this page's outline is `h1` (the list's own name) then `h2` per
 * section. It used to skip a level entirely, because the two `h1` and the `h3`
 * were on the same route and nothing sat between them.
 *
 * **One line at every width, and the numeral is gone.**
 *
 * The head used to be `flex-col` with `sm:flex-row`, so on a phone its two
 * children stacked: the label on one line and the open-count on the next, in the
 * same 11px printed face, eleven pixels apart vertically - two lines saying one
 * thing, with the second line the part a reader actually wanted. It also carried
 * a `count`, padded to `03`, which is a counter's answer rather than a fact about
 * a list, and which put a third copy of the open figure on the page next to the
 * contents row and the count sentence in the head's own screen-reader text. The
 * head is now a row at every width, so anything that belongs beside the label
 * sits beside it rather than under it, and the numeral does not come back.
 *
 * `justify-between` with one child is deliberate and is the point: it is what
 * makes the row a row, so the next thing that belongs beside this label lands
 * beside it rather than under it. `list-board.tsx`'s head already carries a
 * second child - the create button - and lays it out this way from `sm` up.
 */
const SectionHead: React.FC<{ label: string }> = ({ label }) => (
  <div
    className={cn(
      'flex',
      'items-end',
      'justify-between',
      'gap-6',
      'border-t',
      'border-rule',
      'pt-3'
    )}
  >
    <h2 className='label-print pt-1 text-caption'>{label}</h2>
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
  onTransferred,
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
    THE BATCH, AND WHERE IT LIVES.

    `selectedIds` is plain local state and nothing else. It is not a URL, not a
    context and not a server round trip, because marking a wish selected is a
    gesture and a gesture that waits on a request is slower than retyping the wishes
    this whole feature exists to avoid. The page does not change, the sheet does not
    re-fetch, and the only thing that happens is that the bar at the foot counts.

    It exists only inside a transfer mode: the checkboxes and the long-press are
    both gated on `transferMode` (the `canSelect` every `GiftCard` below is
    given), so when the mode ends there is no orphan state to clean up beyond the
    mode itself.

    That is the whole of the "instant" half of the rule: anything that is only local
    state is instant, and this is the most local state in the component.
  */
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  /*
    The active transfer mode - the sheet's second way of being a sheet. While it
    holds a verb, the checkboxes are on the cells, the action bar at the foot is
    the selection bar, and the wishes the reader marks are a batch. `null` is the
    ordinary sheet, and the two verbs on the action bar are the only way in.
  */
  const [transferMode, setTransferMode] = useState<'copy' | 'move' | null>(null);
  /* Whether the transfer request is in flight - the dialog's pending state. */
  const [isTransferPending, setIsTransferPending] = useState(false);

  /*
    The caller's own lists, fetched when a transfer mode is entered rather than
    when the dialog opens.

    The timing is the point. There is idle time between the moments - the reader
    presses *Kopieren* or *Verschieben*, marks wishes, reads the bar, decides, and
    then opens the picker - and fetching during it means the dialog opens with its
    rows already in hand and has nothing to wait for. Fetching on open would make
    the one sheet in the product whose content cannot be known in advance into the
    one that visibly stalls.

    `null` rather than `[]` because "not fetched yet" and "fetched, and there are
    none" are different states: the first is a spinner, the second is an invitation
    to make a list, and collapsing them would tell a reader with a dozen lists that
    they have none.
  */
  const [transferTargets, setTransferTargets] = useState<ListSummary[] | null>(null);
  const [targetsFailed, setTargetsFailed] = useState(false);

  /*
    The batch whose request is in flight, which is NOT the live selection.

    Two lists, and conflating them is a bug with a symptom nothing else would
    catch: the selection is cleared the moment a transfer is sent, so passing it as
    the "currently transferring" set would make that set empty for the whole duration
    of the request - the rows would never dim and never go inert, and the property
    `gift-card.tsx` documents would simply never happen. Worse, the sheet would be
    fully interactive again mid-flight, so a reader could start a second batch on top
    of the first and watch the first one's navigation arrive underneath it.

    So this is captured at the moment the request goes out and released when it
    comes back, and the selection is free to be whatever the reader does next.
  */
  const [transferringIds, setTransferringIds] = useState<string[]>([]);

  /*
    The locale, from the path, because `selectedCountLabel` has to be told which
    language's plural rules to apply and a client component is not handed one.
    `usePathname` plus `getLocaleFromPath` is what `auth-buttons.tsx` already does
    for the same reason, so this is the second place and not a new convention.
  */
  const pathname = usePathname();

  /*
    The selection as it stands on the sheet *now*, which is what is counted, sent and
    dimmed - not `selectedIds` itself.

    The two differ after a transfer is refused with `not_found`: the sheet reloads to
    show what is really there, and a wish that is no longer on it would otherwise stay
    in the batch with nothing on screen to untick. The bar would count a wish nobody
    can see and every further press would be refused for it - a batch the reader could
    only escape by leaving the mode. Derived in render rather than pruned in an effect,
    so there is no moment at which the bar and the sheet disagree.
  */
  const liveSelectedIds = useMemo(
    () => selectedIds.filter((id) => gifts.some((gift) => gift.id === id)),
    [selectedIds, gifts]
  );

  const hasSelection = liveSelectedIds.length > 0;

  /*
    The name of the attempt in flight, held across presses on purpose. It is created
    on the first press of a batch and kept until a transfer succeeds, so a press that
    follows a failure of unknown outcome - a dropped connection, a reply that never
    came - is the *same* attempt and the server can recognise it. Dropped on success
    and with the mode, so the next batch is a new attempt and "copy it again" still
    means a second copy.

    It is deliberately not keyed on the selection or the destination. A reader whose
    reply was lost and who then ticks one more wish should get the new wish and not a
    second copy of the old ones, and the server already tells batches apart by wish
    and by destination (`keyedGiftId`) - so a key that changed with the selection
    would turn that second press into a duplicate instead of a continuation.

    A ref rather than state: nothing renders it, and it must be readable by the press
    handler at the instant of the press, not at the render before.
  */
  const transferRequestId = useRef<string | null>(null);

  /*
    Whether the caller's lists have been asked for already.

    A ref rather than state, and the reason is that this is a latch, not a value
    anything renders: it decides whether a *gesture* starts a request, and reading
    `transferTargets === null` for the same purpose would both re-render the whole
    sheet to answer it and still be wrong on the second wish of a batch, because by
    then `transferTargets` is non-null only if the first request had already landed.
  */
  const targetsRequested = useRef(false);

  const loadTransferTargets = useCallback(async () => {
    try {
      const response = await fetch('/api/lists');
      if (!response.ok) throw new Error('Failed to load lists');

      const body = (await response.json()) as { owned?: ListSummary[] };
      /*
        `owned` and not `shared`: a destination is gated by `findOwnedList`, which
        is 404 for a list the caller does not own, so offering a list they may merely
        read would be offering a row that cannot be pressed. The source is removed
        here rather than in the dialog so that the sheet - which knows which list it
        is - is what guarantees it.
      */
      setTransferTargets((body.owned ?? []).filter((row) => row.id !== list.id));
      setTargetsFailed(false);
    } catch {
      setTargetsFailed(true);
    }
  }, [list.id]);

  const ensureTargets = useCallback(() => {
    if (targetsRequested.current) return;
    targetsRequested.current = true;
    void loadTransferTargets();
  }, [loadTransferTargets]);

  /*
    Selection is computed here rather than inside the state updater.

    The updater stays pure, which matters: React may call a `setState` updater twice
    in StrictMode, so a fetch kicked off from inside one would fire twice on mount in
    development and never be explainable from the code that starts it. The fetch is
    not here at all - it starts on the gesture that creates the intent, the mode
    entry below, and the latch in `targetsRequested` keeps it to one request.
  */
  const toggleSelected = useCallback(
    (giftId: string) => {
      const next = selectedIds.includes(giftId)
        ? selectedIds.filter((id) => id !== giftId)
        : [...selectedIds, giftId];

      setSelectedIds(next);
    },
    [selectedIds]
  );

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  /*
    Entering a transfer mode: the checkboxes appear, the action bar becomes the
    selection bar, and the caller's own lists are asked for - here, on the gesture
    that created the intent, which is the earliest moment it exists. Not on the
    first wish marked (one render after the reader's thumb has already decided) and
    not on the first dialog open (a request that can only start a stall). The latch
    in `targetsRequested` keeps a re-entry from starting a second request, so
    toggling between the two verbs costs nothing.
  */
  const enterTransferMode = useCallback(
    (mode: 'copy' | 'move') => {
      setTransferMode(mode);
      ensureTargets();
    },
    [ensureTargets]
  );

  /*
    Leaving the mode, from the selection bar's *Abbrechen*: the mode and the
    selection are one state machine, so both end at once - a selection with no
    mode would be a batch the sheet has no control left to act on, and a mode
    with no way out would be a trap the reader had to reload to escape.
  */
  const exitTransferMode = useCallback(() => {
    setTransferMode(null);
    clearSelection();
    transferRequestId.current = null;
  }, [clearSelection]);

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

  /* The count, in words, for anyone who cannot see the figure. It is printed in
     the sheet's head rather than as a line of its own, because the number was on
     the page three times - as that line, as the numeral beside "Noch offen", and
     in the contents page row - and the line was the only one of the three that
     said what the number meant. It used to flash the number on every change; the
     numeral in the section head still moves, and the cell itself inverts, so the
     change is reported twice rather than once. */

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
        /*
          Dropped from the batch here rather than by watching the sheet for ids that
          have gone. Deleting is the one event the reader performs on this sheet that
          removes a row while the selection stands - a transfer clears it before it
          sends, and marking bought only moves the wish between two sections of the
          same sheet - so handling the one event that does is both smaller than a
          general effect and impossible to get wrong on a path nobody tested.

          Without it the id would sit in the bar until the reload landed, and a press
          in that gap would have the server refuse the *whole* batch over a row the
          reader had just deleted themselves.

          A row that goes for a reason the reader did not perform - a transfer refused
          because a wish was already gone - is the other case, and `liveSelectedIds`
          covers it by being derived from the sheet rather than from an event.
        */
        setSelectedIds((current) => current.filter((id) => id !== giftId));
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

  /*
    ONE REQUEST FOR THE WHOLE SELECTION, then a toast and a route change.

    The batch is sent as one call because that is the feature: a dozen wishes filed
    wrongly are one mistake, and twelve requests would be twelve chances for the
    batch to end up half-transferred. The server refuses the whole thing if any id
    is not on this sheet, so there is no partial case to reconcile here.

    **The dialog stays open and the selection stays intact until the request has
    succeeded.** Both halves are the spec's own shape rather than a preference: the
    pressed button is what swaps to its pending wording, and a pressed button is only
    visible while the dialog is on screen. Closing it first - which is what this did
    the first time - made that pending state unreachable and threw the state away
    while it was still needed.

    Which matters on failure. A reader who has just discovered their twelve wishes
    are on the wrong sheet is not going to thank an interface that answered a dropped
    request by clearing their selection: they would be back to marking twelve boxes,
    which is the tedium this feature exists to remove. So on a failure the dialog is
    still open with the same row chosen, the selection is still on the sheet, and the
    only new fact is the toast. Pressing again is one tap.

    **That second press is safe, and it has to be.** A dropped connection and a lost
    reply look the same from here: either the batch never arrived or it landed and the
    answer did not come back. The attempt's name (`transferRequestId`) goes out with
    every press and survives a failure, so the server can tell a repeat from a new
    request - a copy is not written twice and a move that already happened answers as
    the success it was.

    **A refusal is read, not flattened.** The server says *why* in `code`, and the
    toast says it back (`transferFailureText`). The one that changes what the sheet
    does is `not_found`: a wish or the destination has gone since this loaded, so the
    sheet and the picker are reloaded to show what is really there. The picker's list
    is the reason - a destination that was deleted would otherwise still be offered,
    and the reader would press the same row into the same refusal.
  */
  const handleTransfer = useCallback(
    async (targetListId: string, mode: 'copy' | 'move') => {
      setIsTransferPending(true);
      setTransferringIds(liveSelectedIds);

      if (transferRequestId.current === null) {
        transferRequestId.current = newRequestId();
      }

      try {
        const response = await fetch(`/api/lists/${list.id}/gifts/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            giftIds: liveSelectedIds,
            targetListId,
            mode,
            requestId: transferRequestId.current,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            code?: unknown;
          } | null;

          toast.error(transferFailureText(dict, body?.code));

          if (body?.code === 'not_found') {
            onGiftChanged();
            void loadTransferTargets();
          }

          return;
        }

        transferRequestId.current = null;
        toast.success(
          mode === 'copy' ? dict.toasts.giftsCopied : dict.toasts.giftsMoved
        );

        // Only now, and in this order: the sheet is leaving, so the batch, the
        // mode and the bar go together rather than one of them being visible on
        // their own. The mode ends here rather than in the `finally` because a
        // failed transfer keeps it - the reader is still filing this batch, and
        // *Abbrechen* is still the way out of it.
        setIsTransferOpen(false);
        setTransferMode(null);
        clearSelection();
        onGiftChanged();
        onTransferred(targetListId);
      } catch {
        toast.error(dict.toasts.giftsTransferFailed);
      } finally {
        setIsTransferPending(false);
        setTransferringIds([]);
      }
    },
    [
      clearSelection,
      dict,
      list.id,
      liveSelectedIds,
      loadTransferTargets,
      onGiftChanged,
      onTransferred,
    ]
  );

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
    <div className='flex flex-col gap-4' style={memberInkStyle(list.ownerId)}>
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
              One sentence under the name, and only for an invited account.

              The owner used to get one here too - "Auf dieser Liste schreibst nur
              du." - stacked directly above the `PRIVAT` chip and its own hint, so
              the head carried the same fact about privacy three times in a row in
              three slightly different sentences: who can write on it, that it is
              private, and who can see it. Two of the three were saying one thing,
              and the sentence that survived was neither the shortest nor the
              clearest of them.

              So the owner gets nothing. The chip below already names the state and
              the sentence beside the chip already says what it means, and a third
              line between them adds no information a reader did not have. The chip
              is where the owner's attention should be anyway - it is the object
              that tells them whether the control beside it is open or closed.

              A buyer keeps a sentence, because theirs answers a question the chip
              cannot: they cannot see or press any of the owner's controls, and
              `PRODUCT.md` treats a control a reader cannot use as a question the
              product has to answer in words. Theirs is about what they *can* do,
              not about who else can read the list.
            */}
            {!isOwner && (
              <p
                data-testid='youAreABuyer'
                className={cn(
                  'max-w-[44ch]',
                  'text-[0.9375rem]',
                  'leading-relaxed',
                  'text-pretty',
                  'text-caption'
                )}
              >
                {dict.listSheet.youAreABuyer}
              </p>
            )}

            {/*
              How far this list reaches, for everybody, in words: the state the
              owner chose and the consequence of having chosen it. It is printed
              rather than signalled by a colour or a tick, and it is on the sheet
              rather than only on the contents page because a buyer who arrived
              here needs to know that this is a list somebody deliberately opened
              to them - and an owner needs it beside the control that closes it.

              Two objects, and they are not the same fact. The chip names the state
              in one word, which is what a reader scanning the page reads; the
              sentence says what the state *means for them*, which is what a reader
              who has never seen the word "private" in this app needs. Merge them
              and one of the two jobs is lost.

              The state is the chip the contents page row carries, so the same two
              words are drawn the same way in both places. It used to be a bare
              `label-print` span here and a chip there, which meant the two places
              that answer the same question about the same object disagreed about
              how to answer it - and here, where it sits directly under the list's
              own name, a plain grey uppercase word was the quietest thing in the
              head.

              The hint is the owner's wording on a buyer's sheet, which is wrong -
              "die von dir eingeladenen Personen" addresses the owner - and it was
              wrong before the chip too. `visibility.sharedHint` wants a second
              sentence for the reader who is only a recipient, and that is the next
              copy pass rather than this one.
            */}
            <p className='flex flex-wrap items-center gap-x-3 gap-y-2'>
              <StatusBadge
                variant={isShared ? 'shared' : 'private'}
                label={
                  isShared ? dict.listBoard.shared : dict.listBoard.private
                }
              />
              <span
                className='max-w-[44ch] text-[0.8125rem] leading-relaxed text-caption'
                data-testid='visibilityHint'
              >
                {isShared
                  ? dict.visibility.sharedHint
                  : dict.visibility.privateHint}
              </span>
            </p>

            {/*
              The count in words, for anyone who cannot see the figure - and
              nothing else. It was a visible line of its own in the 11px label
              face, forty pixels above the section head that prints the same
              number as `03`, so the sheet said "3 GESCHENKIDEEN NOCH OFFEN" and
              "NOCH OFFEN 03" in the same typeface and weight about two inches
              apart. The number was the thing worth reporting; the sentence around
              it was the thing being reported twice.
            */}
            <span className='sr-only'>
              {giftCountLabel(sheetTotals, dict)}
            </span>
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
              <div className='flex flex-col gap-4'>
                <section className='flex flex-col gap-4'>
                  {/*
                    No head at all on an empty sheet, and that is the state the
                    old one was worst in. It read `NOCH OFFEN` with a `00` beside
                    it - a label naming a section that has no content, above a
                    count of nothing, above the dashed plate whose own sentence
                    already says there is nothing here and invites the first one.
                    Three statements of one fact, the smallest two of them in the
                    printed chrome face.

                    The plate is the whole block now: a dashed rule means there is
                    room for a cell, and the only thing anybody can do with room
                    for a cell is write in it.
                  */}
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
                    {/* The invitation, and it is the first thing in the cell.

                        It used to be preceded by the field's own name in the face
                        the section heads use - "GESCHENKIDEE" - which made the
                        blank cell announce what kind of thing it was about to
                        hold before it had invited anybody to put one there. That is
                        a headline for a form that has not been opened yet, and the
                        form labels itself field by field when it does open. It also
                        said "Geschenkidee" on a page whose own subject is a
                        *Wunsch*.

                        The invitation is set in ink rather than in caption, because
                        on a sheet with nothing on it this sentence is the entire
                        content and it was the quietest thing in the cell.
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
              <div className='flex flex-col gap-4'>
                <section className='flex flex-col gap-4'>
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
            <div className='flex flex-col gap-4'>
              {openGifts.length > 0 && (
                <section className='flex flex-col gap-4'>
                  <SectionHead label={dict.listSheet.openIdeas} />
                  <ul className='flex flex-col gap-2'>
                    {openGifts.map((gift) => (
                      <GiftCard
                        key={gift.id}
                        gift={gift}
                        dict={dict.listSheet}
                        canDelete={isOwner}
                        canSelect={isOwner && transferMode !== null}
                        onDelete={(id) =>
                          setPendingDeletion(
                            gifts.find((candidate) => candidate.id === id) ??
                              null
                          )
                        }
                        // The mark is the one control that is never simply
                        // present: an owner may put a mark on but may not take one
                        // off, so on an open idea - which nobody has marked - the
                        // owner clears it and everybody can.
                        onTogglePurchased={handleTogglePurchased}
                        onToggleSelected={toggleSelected}
                        isSelected={selectedIds.includes(gift.id)}
                        transferringIds={transferringIds}
                        togglingId={togglingId}
                        changedId={changedId}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {collectedGifts.length > 0 && (
                <section className='flex flex-col gap-4'>
                  {/*
                    The section head says what the section is, not what it means:
                    the line above already says "nothing left to buy" in the
                    product's own words, so saying it twice here would be two
                    sentences competing for the same fact.
                  */}
                  <SectionHead label={dict.listSheet.collectedIdeas} />

                  {/*
                    `markedBySomeoneElse` is one sentence and it is put here, once,
                    rather than repeated on every collected cell - a sheet with
                    twenty of them would say it twenty times, and a reader needs
                    to know the rule before reading the section, not on every
                    stamp in it. It appears only for the owner: an invited account
                    may clear anybody's mark, so every mark on a list they can
                    read is theirs to undo and there is nothing to explain.

It cannot be rendered inside the cell: `GiftCardProps.dict` is
                     narrowed to five keys and `types.ts` is frozen, so the note
                     is attached to the section from here.

                     And it is conditioned on there being a mark it applies to. The
                     owner check alone printed it on every sheet they opened, including
                     the common case where every collected idea is a mark they set
                     themselves - where the sentence is not merely redundant but
                     untrue, since they can undo all of them. `canClear` is the
                     per-idea half of that question and it is already here.
                  */}
                  {isOwner && collectedGifts.some((gift) => !gift.canClear) && (
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
                        canDelete={isOwner}
                        canSelect={isOwner && transferMode !== null}
                        onDelete={(id) =>
                          setPendingDeletion(
                            gifts.find((candidate) => candidate.id === id) ??
                              null
                          )
                        }
                        onTogglePurchased={handleTogglePurchased}
                        onToggleSelected={toggleSelected}
                        isSelected={selectedIds.includes(gift.id)}
                        transferringIds={transferringIds}
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
            THE SELECTION BAR, IN PLACE OF THE ACTION BAR WHILE A MODE IS ACTIVE.

            The action bar at the foot becomes this bar the moment a transfer
            mode is entered: the three verbs are spent, and what is left to do
            is count what is marked, choose where it goes, or stop. Sticky, and
            that is the load-bearing part of it. A selection made near the top
            of a long sheet has to keep its action reachable, and the foot is
            the one row at the bottom of the scroll on a phone - so a bar that
            merely sat in the flow would be a bar the reader had to scroll to
            the end of a list of twelve wishes in order to use, which is the
            same tedium the feature exists to remove.

            `bottom-0` rather than `top-*`: it is pinned to the foot of the
            viewport, so it stays in the thumb zone on a phone.

            It renders for the whole mode rather than only while something is
            selected, and that is deliberate: a mode with an empty selection
            still has the two things it needs - the count at zero, and the way
            out. *Abbrechen* stays reachable even when the mode has emptied the
            sheet, which is the one state in which this bar is the only control
            on it.

            Three things and no more: how many are selected, where to put them,
            and how to stop. Every other action on a selected wish is still on the
            cell - a bar that also carried "delete these" would make a batch of four
            destructive controls out of one, and this product has exactly two
            destructive controls by design (`PRODUCT.md:67`).
          */}
          {transferMode !== null && (
            <div
              data-testid='selectionBar'
              className={cn(
                'sticky',
                'bottom-0',
                'z-10',
                '-mx-4',
                'border-t',
                'border-rule',
                'bg-sheet',
                'px-4',
                'py-2.5'
              )}
            >
              <div className='flex items-center gap-2'>
                {/*
                  The count, in words, through `selectedCountLabel` and not as a
                  numeral. It is the one new number in the feature and Russian
                  inflects it by number, so a figure here would be a sentence three
                  times over in one of the three shipped languages - and not only in
                  the single digits, which is why the function asks the platform for
                  the plural category rather than counting. The four dictionary keys
                  are the four CLDR categories, beside the one `giftCountLabel`
                  already uses.
                */}
                <span
                  className='min-w-0 flex-1 text-[0.8125rem] leading-snug text-caption'
                  data-testid='selectedCount'
                >
                  {selectedCountLabel(
                    liveSelectedIds.length,
                    getLocaleFromPath(pathname),
                    dict.listSheet
                  )}
                </span>

                {/*
                  Disabled until at least one wish is marked: with nothing
                  chosen there is no destination to choose, and a press would
                  open a picker whose single button could never be pressed. The
                  verb itself was decided on the action bar, so this button
                  names the next decision, not the transfer.
                */}
                <Button
                  variant='outline'
                  onClick={() => setIsTransferOpen(true)}
                  disabled={!hasSelection}
                  className={cn('shrink-0', 'text-[0.875rem]')}
                  data-testid='chooseTargetButton'
                >
                  {dict.listSheet.chooseTarget}
                </Button>

                {/*
                  Out of the mode, not out of the batch alone: it ends the
                  transfer and clears the selection together, because a
                  selection with no mode is a batch the sheet has no control
                  left to act on. It says what it does, and a reader who meant
                  to leave the page can tell this apart from the back row
                  above, which navigates.
                */}
                <Button
                  variant='ghost'
                  onClick={exitTransferMode}
                  className={cn('shrink-0', 'text-[0.875rem]')}
                  data-testid='clearSelection'
                >
                  {dict.listSheet.cancel}
                </Button>
              </div>
            </div>
          )}

          {/*
            THE ACTION BAR, at the foot of the sheet: three verbs, and the
            whole of the owner-only surface below the cells. It replaces the
            one quiet add row that was here before, because the transfer
            feature put two more owner-only actions on this sheet and a foot
            row that could only say "add" was a bar with two buttons missing.

            Three buttons, and their treatment is the hierarchy: *Neuen Wunsch
            erstellen* is solid, because writing a wish down is the action this
            surface exists for; *Kopieren* and *Verschieben* are outline,
            because they act on wishes that already exist. The verb is chosen
            here, once, and the dialog that follows has only the destination
            left to ask.

            Stacked below `sm` and one row from it up: two long German or
            Russian labels do not fit beside a third at 390px, and a wrapped
            row of three is a column, which is what `flex-col gap-2` makes it.
            The buttons fill the width below `sm` for the same reason every
            control on a phone does - a thumb aims at the middle of a wide
            target, not the edge of a narrow one.

            It is the foot row only once the sheet has something on it, and only
            for a reader who may add. On an empty sheet the blank cell is the add
            control, and leaving a second one here would be two controls
            performing one action; for a buyer it would be an invitation to
            perform an action the server refuses. While a mode is active the bar
            is the selection bar instead (above), which is also what keeps
            *Abbrechen* reachable when a mode has emptied the sheet.
          */}
          {gifts.length > 0 && canAdd && transferMode === null && (
            <div className='mt-1 border-t border-rule pt-3'>
              <div className='flex flex-col gap-2 sm:flex-row'>
                <Button
                  onClick={() => setShowAddGiftForm(true)}
                  data-testid='addGiftButton'
                  className={cn('w-full', 'gap-2.5', 'sm:w-auto')}
                >
                  {/* `stroke`, not `strokeWidth`: Tabler reads `stroke` as the
                      stroke width. 1.75 on a 16px icon, carried over from the
                      member sheet so the icon is the same object it was. */}
                  <IconCirclePlus className='h-4 w-4' stroke={1.75} aria-hidden='true' />
                  {dict.listSheet.newGift}
                </Button>

                <Button
                  variant='outline'
                  onClick={() => enterTransferMode('copy')}
                  className={cn('w-full', 'sm:w-auto')}
                >
                  {dict.listSheet.copy}
                </Button>

                <Button
                  variant='outline'
                  onClick={() => enterTransferMode('move')}
                  className={cn('w-full', 'sm:w-auto')}
                >
                  {dict.listSheet.move}
                </Button>
              </div>
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
              data-testid='giftTitleInput'
              name='title'
              placeholder={dict.listSheet.enterGiftTitle}
              maxLength={GIFT_FIELD_LIMITS.title.max}
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
              data-testid='giftDescriptionInput'
              name='description'
              placeholder={`${dict.listSheet.enterDescription} (${dict.listSheet.optional})`}
              maxLength={GIFT_FIELD_LIMITS.description.max}
              rows={3}
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='url' className='label-print text-caption'>
              {dict.listSheet.enterUrl}
            </Label>
            <Input
              id='url'
              data-testid='giftUrlInput'
              name='url'
              type='url'
              placeholder={`${dict.listSheet.enterUrl} (${dict.listSheet.optional})`}
              maxLength={GIFT_FIELD_LIMITS.url.max}
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

        **Two conditions, and the first one is new.** A `PRIVATE` list cannot be
        given anybody, so on every private list ever opened this block printed two
        lines and an empty count - "Noch mit niemandem geteilt / Noch niemand
        eingetragen. / 00" - to say that nobody is on it. The chip in the head has
        already said it, in one word, higher up, and the control that would change
        it sits next to that chip. So the block is absent unless the owner has
        either reached somebody or chosen to.

        The second condition is unchanged: the rows are names and addresses with no
        control on them. Withdrawing is in the share sheet, which is where the
        owner's own three controls are and where a confirmation can state what is
        being withdrawn.
      */}
      {isOwner && (isShared || access.length > 0) && (
        <section className='flex flex-col gap-2'>
          {access.length === 0 ? (
            /*
              One sentence, and no head above it. The head used to read "Noch mit
              niemandem geteilt" and the sentence under it read "Noch niemand
              eingetragen." - the same fact twice, in the same face, thirty pixels
              apart, with a numeral `00` beside the first. A block with nothing in
              it needs to say so once.
            */
            <p
              className='max-w-[44ch] text-[0.8125rem] leading-relaxed text-caption'
              data-testid='nobodyYet'
            >
              {dict.shareList.nobodyYet}
            </p>
          ) : (
            <>
              <SectionHead label={dict.visibility.sharedWith} />

              <ul data-testid='accessList' className='divide-y divide-rule'>
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
            </>
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
        The destination picker, and the one place on this sheet that has to be
        rendered *only* when it is open rather than toggled with a prop - because it
        holds local state (which list is chosen) and a `Dialog` that stays mounted
        with `open={false}` would keep that choice alive between two batches. Mounting
        it fresh each time means it opens with nothing selected, which is the only
        honest state for a picker whose answer depends on a selection the previous
        batch has already gone.

        `isLoading` is `transferTargets === null`, and it is passed rather than
        inferred from an empty array on purpose: the prefetch begins when the mode
        is entered, so a reader can open this before it lands, and `[]` would tell them
        they own no other lists - advice for a situation they are not in.

        The `transferMode !== null` guard is the type's, not the product's: the only
        trigger for this dialog is the selection bar, which exists only inside a mode,
        so there is no state of the sheet in which it could be open without a verb.
        It also means a dialog can never outlive the mode it was opened in.
      */}
      {isTransferOpen && transferMode !== null && (
        <TransferDialog
          isOpen
          onClose={() => setIsTransferOpen(false)}
          lists={transferTargets ?? []}
          isLoading={transferTargets === null}
          sourceListName={list.name}
          dict={dict}
          loadFailed={targetsFailed}
          onRetry={loadTransferTargets}
          mode={transferMode}
          isPending={isTransferPending}
          onTransfer={handleTransfer}
        />
      )}

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