'use client';

import React, { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { IconUserMinus } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmDialog from '@/components/confirm-dialog';
import { isRefusal, type Refusal } from '@/lib/refusals';
import { cn } from '@/lib/utils';
import type {
  ListAccess,
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
 * The audience, and the one field that adds to it.
 *
 * Sharing is by address and only to an account that already exists: there is no
 * pending invitation and no mail anywhere in this product, so the sentence under
 * the field is the whole contract and the one that matters. `shareLead` says it;
 * a disabled field with no explanation would not.
 */
const ShareListDialog: React.FC<ShareListDialogProps> = ({
  isOpen,
  onClose,
  listId,
  listName,
  visibility,
  access,
  dict,
  onChanged,
  onVisibilityChanged,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pendingRevocation, setPendingRevocation] =
    useState<ListAccess | null>(null);

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

        `isSubmitting` is deliberately not cleared here, exactly as in the member
        form this replaces: a request that succeeds closes the sheet, and
        re-enabling the button on a sheet that has not asked for anything would
        only invite a second POST for the same address.
      */
      sheetEpochRef.current += 1;
      setEmailError(null);
      if (!open) onClose();
    },
    [onClose]
  );

  const shareLead = dict.shareList.shareLead;

  const grant = useCallback(
    async (rawEmail: string, epoch: number) => {
      const belongsToOpenSheet = epoch === sheetEpochRef.current;

      /*
        The address goes out exactly as it was typed. Normalising it here as well
        would be a second authority for a rule that has one: `lib/email.ts` says
        the form is not the boundary, and the route accepts the raw value and
        normalises it with `acceptedEmail` before looking the account up - so an
        owner who types `Anna@Example.de` finds the account either way, and a
        malformed address comes back as `invalid_email` and is said so on the
        field below rather than being swallowed by a regex here.
      */
      const email = rawEmail.trim();

      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/lists/${listId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const body = (await response.json().catch(() => null)) as {
          code?: unknown;
          message?: string;
          access?: { displayName?: string; email?: string };
        } | null;

        /*
          A refusal about the address is a form with a wrong value in it, not a
          failed request, and `no_such_account` is the one this dialog exists to
          explain well: the address has to belong to an account already, so the
          sentence belongs on the field where the address was typed rather than
          in a toast that leaves in four seconds.

          The table is keyed by the shared `Refusal` union rather than by six
          bare strings, so a refusal the server adds without a sentence here is
          a type error rather than a missing case, and a refusal that is none of
          the six below misses the table and falls through to the toast further
          down - the same two-way split the member form used.
        */
        const fieldFailures: Record<Refusal, string | undefined> = {
          invalid_email: dict.errors.invalidEmail,
          no_such_account: dict.errors.noSuchAccount,
          already_shared: dict.errors.alreadyShared,
          cannot_share_with_owner: dict.errors.cannotShareWithOwner,
          not_shared_yet: dict.errors.notSharedYet,
          forbidden: dict.errors.forbidden,
          // The other nine are not about this field: credentials, a handle, the
          // three `PATCH` request-shape refusals, and the two authorization codes
          // that mean "you may not", which belong on the sheet rather than under an
          // address somebody typed.
          duplicate_email: undefined,
          weak_password: undefined,
          invalid_display_name: undefined,
          invalid_nickname: undefined,
          duplicate_nickname: undefined,
          invalid_identifier: undefined,
          nothing_to_change: undefined,
          ambiguous_change: undefined,
          invalid_visibility: undefined,
          not_found: undefined,
          cannot_clear_purchase: undefined,
        };

        const fieldFailure =
          isRefusal(body?.code) ? fieldFailures[body.code] : undefined;

        if (fieldFailure !== undefined) {
          if (belongsToOpenSheet) setEmailError(fieldFailure);
          return;
        }

        if (!response.ok) {
          throw new Error(body?.message || `Error: ${response.status}`);
        }

        /*
          The toast names the person who was added, and `accessGranted` is the only
          kind of string in the dictionaries that carries a placeholder. Rendering it
          unsubstituted put a literal `{name}` in front of the owner, which is the
          kind of thing that ships because nothing throws - the sentence is a valid
          string either way, and the dictionary has no way to complain about it.

          The name comes from the grant response rather than from the address the
          owner typed, so the toast says the person's name and not the string they
          happened to type. The address is the fallback: it is in the field above,
          and a sentence with a hole in it is worse than a plainer one.
        */
        const grantee = body?.access?.displayName?.trim() || email;
        toast.success(dict.toasts.accessGranted.replace('{name}', grantee));
        setEmail('');
        setEmailError(null);
        onChanged();
      } catch (error) {
        console.error('Error sharing list:', error);
        toast.error(dict.toasts.accessGrantFailed);
      } finally {
        setIsSubmitting(false);
      }
    },
    [dict, listId, onChanged]
  );

  /*
    Read from state rather than from `FormData`, because the field is emptied when a
    grant lands. The dialog does not close on success - it stays open so the owner
    can add the fourth person while the fourth is in front of them - and an
    uncontrolled field would have kept the address that was just granted, so the
    next submission would be a duplicate and the server would refuse it.
  */
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setEmailError(null);
      grant(email, sheetEpochRef.current);
    },
    [email, grant]
  );

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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={dict.close} className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{dict.shareList.shareTitle}</DialogTitle>
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

            <AccessList
              access={access}
              dict={dict}
              onRevoke={(row) => setPendingRevocation(row)}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='email' className='label-print text-caption'>
                {dict.shareList.enterEmail}
              </Label>
              <Input
                id='email'
                name='email'
                type='email'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // A refusal is cleared on the way in rather than on submit, so
                  // the sentence under the field disappears the moment the address
                  // changes instead of outliving the thing it is about.
                  setEmailError(null);
                }}
                placeholder={dict.shareList.enterEmail}
                autoComplete='off'
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? 'shareEmailError' : undefined}
                required
              />
              {emailError && (
                <p
                  id='shareEmailError'
                  role='alert'
                  data-testid='shareEmailError'
                  className='text-destructive text-[0.875rem] leading-snug'
                >
                  {emailError}
                </p>
              )}
            </div>

            {/*
              The 48px floor, applied only where the one-handed case is: below
              `sm` this is the primary action of the sheet and the phone is where
              it is pressed, which is the same rule `login-form.tsx` applies
              and the same one `PRODUCT.md` calls a floor rather than a
              preference.
            */}
            <Button
              type='submit'
              disabled={isSubmitting}
              className={cn('w-full', 'xs:h-12', 'xs:text-base')}
              data-testid='shareSubmit'
            >
              {isSubmitting ? dict.shareList.adding : dict.shareList.add}
            </Button>

            <AccessList
              access={access}
              dict={dict}
              onRevoke={(row) => setPendingRevocation(row)}
            />
          </form>
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
      </DialogContent>
    </Dialog>
  );
};

/**
 * The people this list is shared with, oldest grant first.
 *
 * `accessForList` orders by `grantedAt`, so the order on screen is the order the
 * owner did it in - which is the useful order when somebody is deciding whether
 * one of these five addresses should still be on the list.
 *
 * The address is printed under the name, not instead of it. A name identifies the
 * person to the owner; the address is the key they will recognise them by, and
 * it is what they typed when they added them.
 */
const AccessList: React.FC<{
  access: ListAccess[];
  dict: ShareListDialogProps['dict'];
  onRevoke: (row: ListAccess) => void;
}> = ({ access, dict, onRevoke }) => (
  <section className='flex flex-col gap-2'>
    <h3 className='label-print text-caption'>
      {access.length > 0
        ? dict.visibility.sharedWith
        : dict.visibility.sharedWithNobody}
    </h3>

    {access.length === 0 ? (
      <p
        className='text-[0.8125rem] leading-relaxed text-caption'
        data-testid='nobodyYet'
      >
        {dict.shareList.nobodyYet}
      </p>
    ) : (
      <ul data-testid='accessList' className='divide-y divide-rule border-y border-rule'>
        {access.map((row) => (
          <li
            key={row.id}
            className='flex items-center justify-between gap-3 py-2'
          >
            <span className='flex min-w-0 flex-col'>
              <span className='break-words text-[0.9375rem] text-ink'>
                {row.displayName}
              </span>
              <span className='min-w-0 truncate text-[0.8125rem] text-caption'>
                {row.email}
              </span>
            </span>

            {/*
              A person being taken off the list, not a row being deleted - and the
              glyph says which. A bin here would read as "delete this person", and
              the difference is the whole point of `PRODUCT.md:101`: a control that
              looks destructive but is not has to say what it actually does. This
              one removes one address's access to one list and nothing else, and the
              person is named next to it.

              Quiet by default and destructive on hover, like every other
              destructive affordance here: a row of red buttons above somebody's
              list says "these people are about to be removed" before anybody has
              touched one.
            */}
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => onRevoke(row)}
              aria-label={`${dict.shareList.revoke} \u00b7 ${row.displayName}`}
              data-testid='revokeAccess'
              className={cn(
                'shrink-0',
                'text-caption',
                '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash',
                '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink'
              )}
            >
              <IconUserMinus className='h-4 w-4' aria-hidden='true' />
            </Button>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default ShareListDialog;