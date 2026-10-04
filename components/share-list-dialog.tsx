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
      <DialogContent closeLabel={dict.close} className='sm:max-w-md'>
        <DialogHeader>
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
          <DialogDescription>{shareLead}</DialogDescription>
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
          <div className='flex flex-col gap-4'>
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
          <div className='flex flex-col gap-6'>
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
                      <li
                        key={group.id}
                        className='flex min-h-11 items-center justify-between gap-3 py-2'
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