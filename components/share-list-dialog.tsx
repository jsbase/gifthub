'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/confirm-dialog';
import { AccountPicker } from '@/components/account-picker';
import { AudienceList } from '@/components/audience-list';
import { cn } from '@/lib/utils';
import type {
  Group,
  ListAccess,
  ListGroupAccess,
  ListVisibilityDialogProps,
  ShareListDialogProps,
} from '@/types';

/**
 * Who may reach one list, and the two states that decide it.
 *
 * Both dialogs this file owns are about the same thing - the edge of a list - and
 * they are the only two places in the product where a *person* is named. A buyer
 * is never named in a response (`lib/list-access.ts` enforces it and `types.ts`
 * has nowhere to put the field), so the audience exists here, on the owner's own
 * screen, and nowhere else.
 *
 * `ListVisibilityDialog` lives in this file rather than in either caller for the
 * same reason `GiftCardBody` lives inside `gift-card.tsx`: one sheet decides what
 * a list's reach looks like, and two sheets deciding it separately is how the two
 * drift. Its prop type is written out inline here, which breaks the repo's
 * "interfaces live in `types.ts`" rule; it is a two-file working exception because
 * the dialog is private to this module and its parent and no fourth caller exists
 * to justify widening `types.ts` for it. Everything it needs is already on
 * `Translations.visibility`, so there is no prop type to share.
 */
export const ListVisibilityDialog: React.FC<ListVisibilityDialogProps> = ({
  isOpen,
  onClose,
  visibility,
  dict,
  onSelect,
}) => {
  const options = [
    {
      value: 'PRIVATE' as const,
      label: dict.visibility.private,
      hint: dict.visibility.privateHint,
    },
    {
      value: 'SHARED' as const,
      label: dict.visibility.shared,
      hint: dict.visibility.sharedHint,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={dict.close} className='sm:max-w-md'>
        <DialogHeader>
          {/*
            The verb, not a name. The primitive sets every title in the specimen
            serif because the convention here is that a sheet is titled by a name;
            this one is titled by an action, and a serif on a verb would break the
            division the type system rests on.
          */}
          <DialogTitle className='font-sans text-xl'>
            {dict.visibility.change}
          </DialogTitle>
        </DialogHeader>

        {/*
          No description sentence, and that is the point of where the two hints
          sit instead. "Private" and "Shared" name a state; each hint states the
          consequence of choosing it, which is the part that matters *before*
          anybody presses anything - so each hint is printed under the option it
          belongs to and both are on screen at once. A single description at the
          top could only have carried one of them, and the other choice would
          have been made on its label alone.
        */}

        <div role='group' className='flex flex-col gap-2'>
          {options.map((option) => {
            const isCurrent = option.value === visibility;
            return (
              <Button
                key={option.value}
                type='button'
                variant={isCurrent ? 'default' : 'outline'}
                // Two pressed states rather than a radiogroup: exactly one of two
                // values is set, and `aria-pressed` says which without
                // importing the arrow-key contract a radio group also promises
                // and would then have to implement.
                aria-pressed={isCurrent}
                onClick={() => onSelect(option.value)}
                data-testid={`visibility-${option.value.toLowerCase()}`}
                className={cn(
                  // `h-auto`: this control is two lines of text, and the
                  // primitive's 44px would be the *shorter* of the two floors
                  // rather than the shape's own. 44px still holds - the label
                  // line and the hint line together are taller than that.
                  'h-auto',
                  'w-full',
                  'justify-start',
                  'items-start',
                  'gap-3',
                  'py-3',
                  'text-left',
                  'whitespace-normal'
                )}
              >
                <span className='flex min-w-0 flex-col gap-1'>
                  <span className='label-print'>{option.label}</span>
                  <span
                    className={cn(
                      'text-[0.8125rem]',
                      'leading-relaxed',
                      'text-pretty',
                      isCurrent ? 'text-ink-foreground/80' : 'text-caption'
                    )}
                  >
                    {option.hint}
                  </span>
                </span>
              </Button>
            );
          })}
        </div>

        {/*
          The consequence of moving a list back to private is not that anybody is
          removed, so this dialog says neither. `setVisibility` in
          `lib/list-access.ts` leaves the access rows in place and only closes the
          reads, and a word like "removes the people" in front of that control
          would be a lie the server does not tell. The hint under each option is
          the whole explanation: private means only you can see it, and that is all
          it does.
        */}
      </DialogContent>
    </Dialog>
  );
};

/**
 * The audience, and the two controls that add to it.
 *
 * Sharing is by account, and an account is named either by a nickname or by an
 * address. `shareLead` says so, and the control below it is a lookup rather than an
 * address field because the owner very often knows one and not the other - which is
 * the whole reason `GET /api/accounts/search` exists, and the reason its widening is
 * recorded in `lib/account-search.ts` rather than glossed over.
 *
 * A list reaches people and groups, and the two are the *same* capability with
 * different audiences: a group member gets exactly what an invited account gets.
 * Both controls are here because this sheet is about one list's reach; where a group
 * is *made* is `groups-dialog.tsx`, which cannot be reached from here because a group
 * has to exist before there is a list to share it with.
 */
const ShareListDialog: React.FC<ShareListDialogProps> = ({
  isOpen,
  onClose,
  listId,
  listName,
  visibility,
  access,
  groupAccess,
  dict,
  onChanged,
  onVisibilityChanged,
}) => {
  const [pendingRevocation, setPendingRevocation] =
    useState<ListAccess | null>(null);
  const [pendingGroupRevocation, setPendingGroupRevocation] =
    useState<ListGroupAccess | null>(null);

  /*
    `null` rather than `[]` for "not read yet", so the first paint of the group
    section is not a claim that the owner has no groups. They may well have some and
    the read may still be in flight, and "you have no groups" printed for two hundred
    milliseconds on every open would be a false statement about their account.
  */
  const [myGroups, setMyGroups] = useState<Group[] | null>(null);
  const [isSharingGroup, setIsSharingGroup] = useState<string | null>(null);

  /*
    Which sheet an answer belongs to, ported from the member sheet this dialog
    replaces and for the same reason: a counter that moves on every open and
    every close, because `isOpen` alone cannot tell "some sheet is up" from "this
    is the one that asked". A grant that resolves after an Esc and a reopen would
    otherwise put its refusal on a field nobody submitted into.
  */
  const sheetEpochRef = useRef(0);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      /*
        The refusal is cleared on the way out rather than on the way in. It is
        state that outlives the thing that displays it - both callers unmount this
        dialog rather than closing it - so an Esc that leaves the verdict standing
        would put it back on an empty field the next time it opens, as an
        `aria-invalid` nobody earned.

        Both pending confirmations are cleared for the same reason and one step
        further: they name a row, and the audience they belong to is re-read on the
        next open, so a confirmation surviving a close would be a prompt about a row
        that may no longer be in the list.
      */
      sheetEpochRef.current += 1;
      setPendingRevocation(null);
      setPendingGroupRevocation(null);
      if (!open) onClose();
    },
    [onClose]
  );

  const shareLead = dict.shareList.shareLead;

  /*
    The owner's own groups, read when the sheet opens and only on a shared list.

    `null` state is not read yet, `[]` is read and there are none, and the render
    distinguishes them: the third case is `noGroupsToShare` and the first renders
    nothing. An effect rather than a read on open because Radix only calls
    `onOpenChange` for a change made from inside the dialog, and both callers open
    this sheet by setting their own state - so a read on open would never run.

    Cancelled on cleanup, and the guard is checked after the `await` rather than
    before the fetch, because the answer is the thing that arrives late: both callers
    unmount the dialog on close, and a setState on an unmounted component is the
    warning React 19 removed the log for rather than fixed.
  */
  useEffect(() => {
      /*
        Early return rather than `setMyGroups(null)` on the way out. Clearing state
        synchronously inside an effect body is a cascading render for a value nobody
        is looking at - the private branch below does not render the group section at
        all - and `react-hooks/set-state-in-effect` is right that it buys nothing. The
        stale value is unreachable: every render of it is inside the `SHARED` branch,
        and the effect re-reads on the next open anyway.
      */
      if (!isOpen || visibility !== 'SHARED') return;

      let cancelled = false;

    const read = async () => {
      try {
        const response = await fetch('/api/groups');
        const body = (await response.json().catch(() => null)) as {
          groups?: Group[];
        } | null;
        if (cancelled) return;
        setMyGroups(response.ok ? body?.groups ?? [] : []);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading groups:', error);
        setMyGroups([]);
      }
    };

    read();

    return () => {
      cancelled = true;
    };
  }, [isOpen, visibility]);

  /*
    Share with one whole group.

    Addressed by group id and not by name, and the name is only ever display: two
    groups can be called the same thing across two owners, and `Group.name` is unique
    per owner rather than globally, so a name is not a key the server could accept.

    A group row already in the audience is shown as granted rather than as a
    control, because pressing it would be answered `already_shared` - a refusal the
    owner would see for doing what the screen invited them to do.

    Every failure here is a toast and not a sentence under the control, including
    `already_shared`. The list is shared by people through a field that can hold a
    wrong value and be corrected, and this is a row of buttons with no value to
    correct; a toast is the honest place for "that did not work" when there is no
    field to attach it to.
  */
  const shareWithGroup = useCallback(
    async (group: Group) => {
      setIsSharingGroup(group.id);
      try {
        const response = await fetch(`/api/lists/${listId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId: group.id }),
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        toast.success(dict.toasts.groupShared.replace('{name}', group.name));
        onChanged();
      } catch {
        toast.error(dict.toasts.groupShareFailed);
      } finally {
        setIsSharingGroup(null);
      }
    },
    [dict.toasts.groupShareFailed, dict.toasts.groupShared, listId, onChanged]
  );

  const revokeGroup = useCallback(
    async (row: ListGroupAccess) => {
      try {
        /*
          The group's own path rather than the access one, because a `DELETE` has no
          body to say which kind of row it means and guessing by trying both tables
          is the unscoped lookup `app/api/lists/[id]/group-access/[accessId]/route.ts`
          explains is not worth repeating.
        */
        const response = await fetch(
          `/api/lists/${listId}/group-access/${row.id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        toast.success(
          dict.toasts.groupAccessRevoked.replace('{name}', row.groupName)
        );
        onChanged();
      } catch {
        toast.error(dict.toasts.groupAccessRevokeFailed);
      }
    },
    [
      dict.toasts.groupAccessRevokeFailed,
      dict.toasts.groupAccessRevoked,
      listId,
      onChanged,
    ]
  );

  const handleConfirmRevokeGroup = useCallback(() => {
    if (pendingGroupRevocation) revokeGroup(pendingGroupRevocation);
  }, [pendingGroupRevocation, revokeGroup]);

  /*
    The one way a private list can become shared without leaving this dialog, and
    it is a control rather than a field that is switched off. The server refuses a
    grant on a private list with `not_shared_yet`, so a greyed-out field would
    tell the owner a rule they cannot read; the field is replaced instead by the
    sentence saying what has to happen first and the control that does it.
  */
  const makeShared = useCallback(async () => {
    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: 'SHARED' }),
      });

      if (!response.ok) throw new Error('Failed to change visibility');

      toast.success(dict.toasts.visibilityChanged);
      onVisibilityChanged();
    } catch {
      toast.error(dict.toasts.visibilityChangeFailed);
    }
  }, [dict.toasts.visibilityChanged, dict.toasts.visibilityChangeFailed, listId, onVisibilityChanged]);

  const revoke = useCallback(
    async (row: ListAccess) => {
      try {
        /*
          Keyed by the access row rather than by the account, because that is
          what `revokeAccess` in `lib/list-access.ts` takes: the URL names the grant being
          withdrawn, and a row can outlive the account it names.
        */
        const response = await fetch(
          `/api/lists/${listId}/access/${row.id}`,
          { method: 'DELETE' }
        );

        if (!response.ok) throw new Error('Failed to revoke access');

        // The same placeholder as the grant, filled from the row the owner just
        // confirmed. The name is already in the dialog, so there is nothing to read
        // back from the response - and the revoke response carries the row anyway,
        // so either source would do. See the grant for why an unsubstituted
        // placeholder ships without anything failing.
        toast.success(
          dict.toasts.accessRevoked.replace(
            '{name}',
            row.displayName?.trim() || row.email || ''
          )
        );
        onChanged();
      } catch {
        toast.error(dict.toasts.accessRevokeFailed);
      }
    },
    [dict.toasts.accessRevoked, dict.toasts.accessRevokeFailed, listId, onChanged]
  );

  const handleConfirmRevoke = useCallback(() => {
    if (pendingRevocation) revoke(pendingRevocation);
  }, [pendingRevocation, revoke]);

  /*
    The groups this list is *not* on yet, and nothing else.

    `myGroups` is every group the account owns; the audience above already prints
    the ones that have a grant on this list. Rendering `myGroups` in full meant a
    granted group appeared twice in one sheet - once under the audience saying
    "you can reach this", once under the offer saying the same name with no
    control at all - and the two rows looked identical because they were, down to
    the name and the person count. Subtracting the granted ids here is the whole
    fix, and it is a subtraction rather than a second lookup because
    `groupAccess` is already on the sheet.
  */
  const offerableGroups = (myGroups ?? []).filter(
    (group) => !groupAccess.some((row) => row.groupId === group.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/*
        `sm:max-w-lg`, which is 512px, against the primitive's `sm:max-w-[32rem]`
        that this file was overriding down to `sm:max-w-md` - 448px.

        Measured, at 448: the widest row this sheet carries is a group in the offer,
        which is a name, a person count and a 44px "Hinzufügen" in a
        `whitespace-nowrap` button. The name got 236px of the card's 408px content
        measure, and a German group name is longer than that. The audience row is the
        same shape with a narrower control and fares a little better, and three
        stacked regions make this the tallest thing per pixel of width on the page.

        It is the one dialog in the app that has to carry a two-column row with an
        action *and* three regions, so it is the one dialog that needs the wider
        sheet - and it is set here rather than in `dialog.tsx` because every other
        sheet in this app is a single-column form, and widening the primitive would
        widen all of them for the sake of one. `ListVisibilityDialog` above keeps
        the 448 it had.

        A phone is untouched by this, and that is why it is written at `sm`: below
        640 the sheet is the page under the header and takes the whole viewport
        width, so a max-width cannot buy a phone anything. Everything that helps a
        phone is in the spacing below.
      */}
      <DialogContent closeLabel={dict.close} className='sm:max-w-lg'>
        {/*
          `gap-2 xs:gap-2`, and both halves written out.

          The primitive's header is `gap-1.5` with `xs:gap-1`, and this header
          carries three things: the title, the list name, and the standing
          instruction under them. Six pixels under a title, and four on a phone, is
          the cramping this sheet was reported for - and passing `gap-2` alone would
          not have fixed it, because `xs:gap-1` is a different modifier group and
          `twMerge` keeps both, so the phone would have kept its four pixels. The
          same trap `dialog.tsx` documents for `sm:max-w-*`; the second class is
          worth it to be certain which value each width gets.

          Eight pixels and not more, because the name is an 11px tracked label and
          the instruction below it is a 13px sentence: these are three lines of one
          head, not three sections, and what they want is the separation inside a
          paragraph rather than the separation between parts of a page.
        */}
        <DialogHeader className='gap-2 xs:gap-2'>
          {/*
            `font-sans text-xl` against the primitive's serif default, and the
            reason is written down twice in this file already: the title is a
            verb, and a serif on a verb is the one thing the type division does
            not allow. It was taking the 24px serif default anyway, which is what
            put this sheet's title in a different face at a different size from
            the create, rename and visibility sheets beside it.
          */}
          <DialogTitle className='font-sans text-xl'>
            {dict.shareList.shareTitle}
          </DialogTitle>
          {/*
            Which list, in the printed label face the sheet uses for its section
            heads. The title above it is a verb and there is only ever one of them
            open at a time, so on a contents page with five lists the name is what
            tells this sheet which list it is about.
          */}
          <p
            className='label-print mt-1 text-caption'
            data-testid='shareListName'
          >
            {listName}
          </p>
          {/*
            `shareLead`, one rank down from the primitive's 15px.

            It is a standing instruction, not content: it says what adding somebody
            to this list *permits*, which is the same fact every time anybody opens
            this sheet and is never the thing they came to do. At 15px it was the
            second-loudest thing in the dialog after the title, it ran to two lines,
            and it pushed the audience - the actual state, the reason the sheet was
            opened - below 100px of its own. At 13px, in the caption weight it was
            already in, with the leading opened up rather than tightened, it reads as
            a printed note under the title and costs one line less.

            13px rather than the 11px of `label-print`, because it is a sentence and
            not a label: the registry puts 11px on tracked uppercase chrome and
            nothing else. The contents page already sets its row meta at 13px in
            this same voice (`components/list-row.tsx`), so this is an existing
            register on a sheet rather than a new size.
          */}
          <DialogDescription className='text-[0.8125rem] leading-relaxed'>
            {shareLead}
          </DialogDescription>
        </DialogHeader>

        {visibility === 'PRIVATE' ? (
          /*
            Private means the audience cannot be added to, so the field is gone -
            not inert. What replaces it is the sentence that explains why and the
            one control that fixes it.

            The audience itself stays, and its revoke controls stay with it:
            withdrawing access is the one action here that can only reduce what
            somebody else can reach, and `lib/list-access.ts` deliberately does
            not require `SHARED` for it. Hiding that behind a private list would
            make access revocable only by deleting the list.
          */
          /*
            `gap-5`, up from `gap-4`, for the same reason the shared branch below
            is at 32: on a phone this sheet *is* the page under the header, so the
            distance between the sentence that explains the state, the one control
            that changes it, and the audience that can already be reached is the
            distance between three parts of a page. On the card the same three are
            three blocks of a form and 20px is enough.
          */
          <div className='flex flex-col gap-5'>
            <p
              className='text-[0.9375rem] leading-relaxed text-pretty text-caption'
              data-testid='privateFirst'
            >
              {dict.shareList.privateFirst}
            </p>

            <Button
              type='button'
              onClick={makeShared}
              className={cn('w-full', 'xs:h-12', 'xs:text-base')}
              data-testid='makeShared'
            >
              {dict.shareList.makeShared}
            </Button>

            <AudienceList
              access={access}
              groupAccess={groupAccess}
              dict={dict}
              onRevoke={(row) => setPendingRevocation(row)}
              onRevokeGroup={(row) => setPendingGroupRevocation(row)}
            />
          </div>
        ) : (
          /*
            `gap-8 sm:gap-7`, and it is written the other way round from most of this
            file on purpose.

            Below `sm` the sheet is the page under the header, full-bleed and
            `100dvh` tall, and 24px between its three regions is a page whose parts
            are touching: measured at 390px, the audience head sat 96px under the
            last line of the standing instruction and the search field 40px under the
            last audience row. This is the cramping the sheet was reported for, and
            it is a spacing problem rather than a width one - nothing here is
            overflowing, everything is just too close.

            32px on a phone and 28px on the card is one step, not two: the card is
            the better-fitting of the two arrangements already, being 512px wide with
            a line length this sheet never reaches, so it needs less separation
            rather than more. Written mobile-first, which means the larger value is
            the one with no breakpoint in front of it.
          */
          <div className='flex flex-col gap-8 sm:gap-7'>
            {/*
              **The audience comes first, because it is the state and the rest of
              this sheet is the two ways to change it.** It used to come last, under
              a search field and a list of groups to offer, which meant the answer to
              "who can already open this list" was below two invitations to add
              somebody - and on a phone, below the fold.

              And it used to answer that question twice. `AudienceList` printed the
              groups already reaching this list under a head reading "Gruppen", and
              the offer above it printed the *same* groups again, from `myGroups`,
              each labelled "Geteilt" and each carrying no control. One group, one
              sheet, two rows, two opposite affordances - and the only difference
              between them was which list the renderer had walked. The offer is now
              filtered to the groups that are not here yet, so every group appears
              exactly once and the two sections cannot contradict each other.
            */}
            <AudienceList
              access={access}
              groupAccess={groupAccess}
              dict={dict}
              onRevoke={(row) => setPendingRevocation(row)}
              onRevokeGroup={(row) => setPendingGroupRevocation(row)}
            />

            {/*
              The lookup and the grant, in one component, because they are one
              interaction: picking a row *is* adding the person. Splitting them would
              have meant a result list with a separate confirm button, and a confirm
              button on "add this person" asks a question the click already answered.

              There is no submit button. The field is a search, not a form, and the old
              `shareSubmit` existed only because the old field needed a typed address
              submitted. A control that is only meaningful mid-interaction does not get
              a 48px floor either - it is not a primary action of the sheet, and giving
              it one would have made it look like the thing to press.
            */}
            <AccountPicker
              listId={listId}
              dict={dict}
              alreadyShared={access
                .map((row) => row.accountId)
                .filter((id): id is string => id !== null)}
              onGranted={onChanged}
              isVisible
            />

            {/*
              Groups that are not on this list yet. Absent entirely - not disabled,
              not collapsed - when every group the owner has is already here, and
              replaced by one sentence when they have no groups at all, and the
              whole block is already replaced by the sentence above on a private
              list, where a group grant is refused exactly as a person one is.
            */}
            {myGroups !== null &&
              (myGroups.length === 0 ? (
                <section className='flex flex-col gap-2'>
                  <h3 className='label-print text-caption'>
                    {dict.shareList.groupPickerHeading}
                  </h3>
                  <p
                    className='text-[0.8125rem] leading-relaxed text-caption'
                    data-testid='noGroupsToShare'
                  >
                    {dict.shareList.noGroupsToShare}
                  </p>
                </section>
              ) : offerableGroups.length > 0 && (
                <section className='flex flex-col gap-2'>
                  <h3 className='label-print text-caption'>
                    {dict.shareList.groupPickerHeading}
                  </h3>

                  <ul
                    data-testid='groupPicker'
                    className='divide-y divide-rule border-y border-rule'
                  >
                    {offerableGroups.map((group) => (
                      /*
                        `py-3` and `gap-4`, up from `py-2` and `gap-3`.

                        A row here is two lines of type - a name and how many
                        people one grant reaches - beside a 44px control, and
                        `py-2` made it 60px of which the padding was 16. On a
                        phone, where this block can be several rows and is the
                        last thing on the sheet, they read as a solid block of
                        buttons rather than as a list of groups. `py-3` is 68px
                        and the name clears the control's edge; `gap-4` is what
                        stops a long name from touching "Hinzufügen", which is
                        `whitespace-nowrap` and therefore never gives way itself.
                      */
                      <li
                        key={group.id}
                        className='flex min-h-11 items-center justify-between gap-4 py-3'
                        data-testid='groupPickerRow'
                      >
                        <span className='flex min-w-0 flex-col'>
                          {/*
                            A group name is a name, so it takes the one serif this
                            product allows. At this row's size rather than the
                            contents page's, because this is a line in a list and not
                            the largest object in a sheet.
                          */}
                          <span className='font-serif break-words text-[0.9375rem] font-semibold leading-snug text-ink'>
                            {group.name}
                          </span>
                          <span className='min-w-0 truncate text-[0.8125rem] text-caption'>
                            {dict.shareList.groupReaches.replace(
                              '{count}',
                              String(group.memberCount)
                            )}
                          </span>
                        </span>

                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={isSharingGroup === group.id}
                          onClick={() => shareWithGroup(group)}
                          data-testid='shareWithGroup'
                          className={cn(
                            'shrink-0',
                            '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash'
                          )}
                        >
                          {isSharingGroup === group.id
                            ? dict.shareList.adding
                            : dict.shareList.add}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
          </div>
        )}

        {/*
          Withdrawing is confirmed, and not because it destroys anything: the
          audience row is a row, and deleting it is reversible by typing the
          address again. It is confirmed because the consequence is somebody
          losing read access to a list about a person they may be about to buy a
          present for, and because `revokeConfirmTitle` exists for exactly this
          prompt.

          The description is the row's own name and address. The dictionary ships
          a title for this confirmation and no sentence for its body, and the
          fact this turns on is *whom* - so that is what it names.
        */}
        <ConfirmDialog
          isOpen={pendingRevocation !== null}
          onClose={() => setPendingRevocation(null)}
          onConfirm={handleConfirmRevoke}
          title={dict.shareList.revokeConfirmTitle}
          description={`${pendingRevocation?.displayName ?? ''} \u00b7 ${
            pendingRevocation?.email ?? ''
          }`}
          confirmLabel={dict.shareList.revoke}
          cancelLabel={dict.cancel}
        />

        {/*
          Withdrawing a group is confirmed in its own words, and the description is
          the group's size rather than its name. The name is in the title area and the
          size is the part that cannot be inferred from it: pressing this takes read
          access away from everybody in the group at once, and somebody with four
          people in their family group needs to be told four before they are told
          anything.
        */}
        <ConfirmDialog
          isOpen={pendingGroupRevocation !== null}
          onClose={() => setPendingGroupRevocation(null)}
          onConfirm={handleConfirmRevokeGroup}
          title={dict.shareList.revokeGroupConfirmTitle}
          description={`${pendingGroupRevocation?.groupName ?? ''} \u00b7 ${dict.shareList.groupReaches.replace(
            '{count}',
            String(pendingGroupRevocation?.memberCount ?? 0)
          )}`}
          confirmLabel={dict.shareList.revoke}
          cancelLabel={dict.cancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ShareListDialog;