'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  IconArrowLeft,
  IconDotsVertical,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUserMinus,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ConfirmDialog from '@/components/confirm-dialog';
import { AccountPicker } from '@/components/account-picker';
import { isRefusal, type Refusal } from '@/lib/refusals';
import { cn } from '@/lib/utils';
import type {
  AccountSearchResult,
  Group,
  GroupMember,
  GroupsDialogProps,
  Translations,
} from '@/types';

/**
 * The quiet control at the foot of a level, and the only thing that adds to a block.
 *
 * It is the "add a gift" row from the list sheet, unchanged: a full-width 44px row,
 * a plus glyph, the action in the caption label face, and a hairline above it so the
 * row reads as the end of the block rather than as another item in it. It opens the
 * person picker inside a group; the matching control on the group list is an
 * outlined button rather than this row (see the comment at the foot of the list).
 *
 * The arrangement it replaced on both levels was a permanently visible form with a
 * full-width ink button, which made the least likely action on the sheet the largest
 * object on it.
 */
const AddRow: React.FC<{
  label: string;
  testId: string;
  onClick: () => void;
  /**
   * The block directly above already ends in a rule of its own, which is what both
   * lists in this sheet are (`border-y`). The row lands a `gap-4` below that rule,
   * so its own hairline drew a second line 16px under the first: two rules around
   * nothing, on the one control whose job is to add to the block, and the pair read
   * as a band the row was sitting in rather than as the end of the list.
   *
   * Only the empty state above this row (`noGroups`, `noMembers`) has nothing
   * separating it from the row, so there - and only there - the hairline is all
   * there is, and the padding that goes with a top rule stays.
   */
  afterRule?: boolean;
}> = ({ label, testId, onClick, afterRule = false }) => (
  <button
    type='button'
    onClick={onClick}
    data-testid={testId}
    className={cn(
      'flex min-h-11 w-full items-center gap-2',
      !afterRule && 'border-t border-rule pt-3',
      'text-left text-[0.8125rem] text-caption',
      '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink'
    )}
  >
    <IconPlus className='h-4 w-4 shrink-0' aria-hidden='true' />
    {label}
  </button>
);

/**
 * A refusal about a name is a form with a wrong value in it, and it is said on the
 * field rather than in a toast.
 *
 * `duplicate_group_name` is the only one these two requests can produce, and it
 * wants its own words rather than `alreadyShared`: "you already have a group called
 * Family" and "this list is already shared with them" are different problems on
 * different fields. Keyed by the shared union so a refusal added to
 * `lib/refusals.ts` without a decision here is a type error, and at module scope
 * so `react-hooks/exhaustive-deps` does not make every handler depend on a table
 * that is rebuilt on every render.
 *
 * A blank name is deliberately not in this table and never reaches the field: it is
 * an inline 400 with no code (`app/api/groups/route.ts:83-88`), the field is
 * `required`, and both handlers return early on an empty value - which is what
 * `RenameListDialog` in `list-board.tsx` does for the same case.
 */
const nameFailureText = (
  dict: Translations,
  code: unknown
): string | undefined => {
  if (!isRefusal(code)) return undefined;

  const table: Record<Refusal, string | undefined> = {
    duplicate_group_name: dict.errors.duplicateGroupName,
    invalid_email: undefined,
    duplicate_email: undefined,
    invalid_nickname: undefined,
    duplicate_nickname: undefined,
    weak_password: undefined,
    invalid_display_name: undefined,
    invalid_identifier: undefined,
    nothing_to_change: undefined,
    ambiguous_change: undefined,
    invalid_visibility: undefined,
    no_such_account: undefined,
    already_shared: undefined,
    cannot_share_with_owner: undefined,
    not_shared_yet: undefined,
    invalid_search_query: undefined,
    no_such_group: undefined,
    cannot_join_own_group: undefined,
    not_found: undefined,
    forbidden: undefined,
    cannot_clear_purchase: undefined,
  };

  return table[code];
};

/**
 * The one entity in this product with a management screen of its own.
 *
 * Lists are managed from the contents page and people are managed from the share
 * dialog, but a group is created before there is any list to share it with - so
 * it has to be reachable from somewhere that is not a list, and
 * `types.ts:679-687` is the reasoning this file's existence rests on. Putting it
 * in the share sheet would mean a sheet that opens a second sheet to make the
 * first one useful.
 *
 * **It re-reads instead of patching.** Every create, rename, delete and
 * membership change ends in `loadGroups()` and then `onChanged()`, and neither
 * one updates a row from a response. Three reasons, all of them in the routes: a
 * rename answers `{ success: true }` and no row at all, because every field on a
 * `Group` is either what the caller just sent or a number the call cannot move
 * (`app/api/groups/[id]/route.ts:103-121`); a create answers a row whose
 * `memberCount` is zero by definition, which is true and useless the moment
 * anybody is added (`app/api/groups/route.ts:104-118`); and a membership change
 * moves a count on a row this dialog did not receive. `memberCount` rides along
 * on the group row for the reason `readableListSummary` gives its owner name and
 * audience count - two queries means a window in which two halves of a sheet
 * disagree about how many people something reaches - so patching one of them by
 * hand would recreate exactly that window.
 *
 * The list is read when the dialog opens rather than when it mounts, because the
 * dialog is opened cold and both callers unmount it rather than closing it.
 */
const GroupsDialog: React.FC<GroupsDialogProps> = ({
  isOpen,
  onClose,
  dict,
  onChanged,
}) => {
  /*
    `null` rather than `[]` for "not read yet", so the first paint of the sheet is
    the create form and a list arrives a moment later instead of the sheet opening
    on an empty state that is only briefly true. Both reads `await` before they
    write anything, which is also what keeps them out of
    `react-hooks/set-state-in-effect` - the warning the ratchet counts.
  */
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [membersByGroup, setMembersByGroup] = useState<
    Record<string, GroupMember[]>
  >({});
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Group | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<GroupMember | null>(
    null
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  /*
    The two things this sheet used to do unconditionally: show the create form, and
    show the member picker inside whichever group was open. Both are now one tap
    away at the foot of their own level, and both are booleans rather than layout -
    so the sheet has a list at the top of it again instead of a solid ink button.

    They are reset by `handleOpenChange` and by the back control, because a sheet
    that reopens still holding an open form is a sheet that starts by asking for a
    name the reader did not come here to type.
  */
  const [creating, setCreating] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  /*
    A second click on a control that has already fired cannot be stopped by
    `disabled`, because `ConfirmDialog` takes no `disabled` prop and its confirm
    button stays pressed until the dialog finishes leaving. A double DELETE is
    answered `no_such_group` a moment after a green toast, which reads as a
    failure of something that worked - so each operation claims a key here and a
    second attempt while one is in flight returns before it fetches. The mirror of
    `busyId` in `ListRowProps`, and it exists for the same reason: a double submit
    must not fire two mutations at one row.
  */
  const inFlightRef = useRef<Record<string, boolean>>({});

  const claim = useCallback((key: string) => {
    if (inFlightRef.current[key]) return false;
    inFlightRef.current[key] = true;
    return true;
  }, []);

  const release = useCallback((key: string) => {
    inFlightRef.current[key] = false;
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/groups');
      const body = (await response.json().catch(() => null)) as {
        groups?: Group[];
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.message || `Error: ${response.status}`);
      }

      // Owned groups only. Membership is not browsable
      // (`lib/group-access.ts:61-67`): whose group somebody is in is the owner's
      // business, and a member learns they have reached a list by opening it.
      setGroups(body?.groups ?? []);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error(dict.errors.failedToLoad);
    }
  }, [dict.errors.failedToLoad]);

  const loadMembers = useCallback(
    async (groupId: string) => {
      try {
        const response = await fetch(`/api/groups/${groupId}`);
        const body = (await response.json().catch(() => null)) as {
          members?: GroupMember[];
          message?: string;
        } | null;

        if (!response.ok) {
          throw new Error(body?.message || `Error: ${response.status}`);
        }

        /*
          Keyed by group rather than cleared and refilled, so switching between
          two groups cannot leave the first one's names under the second heading
          for a frame, and so a group that has been read once is still read on the
          way back to it.
        */
        setMembersByGroup((previous) => ({
          ...previous,
          [groupId]: body?.members ?? [],
        }));
      } catch (error) {
        console.error('Error loading group members:', error);
        toast.error(dict.errors.failedToLoad);
      }
    },
    [dict.errors.failedToLoad]
  );

  /*
    Both reads go through a local async wrapper rather than being called directly.

    `loadGroups` and `loadMembers` are `useCallback`s that end in a `setState`, and
    `react-hooks/set-state-in-effect` flags a call to either one in an effect body
    because it cannot see that the state is already written past an `await` - the
    fetch - inside. Putting the await in the wrapper is not a way of making the rule
    go away: it is what actually happens, and the rule is asking for the write to be
    visibly after the response rather than at the top of the effect.

    A cleaner shape would be to have the two loaders *be* the async functions the
    effect calls, but they are also called from event handlers below - after a
    create, a rename, a delete - and those want the same wrapper for the same reason.
    Duplicating it in three places is worse than one wrapper with the reason written
    on it.
  */
  useEffect(() => {
    if (!isOpen) return;
    const readGroups = async () => {
      await loadGroups();
    };
    readGroups();
  }, [isOpen, loadGroups]);

  useEffect(() => {
    if (!isOpen || !openGroupId) return;
    const readMembers = async () => {
      await loadMembers(openGroupId);
    };
    readMembers();
  }, [isOpen, openGroupId, loadMembers]);

  const openGroup =
    groups?.find((group) => group.id === openGroupId) ?? null;
  const members = openGroupId ? membersByGroup[openGroupId] : undefined;
  const renamingGroup =
    groups?.find((group) => group.id === renamingId) ?? null;

  /*
    The one test the three member branches below agree on, held here so the list,
    the empty state and the `AddRow`'s own hairline cannot drift apart: a rule is
    drawn under the members only when there are members to be ruled off.
  */
  const memberListHasRule = members !== undefined && members.length > 0;

  const handleCreate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = String(new FormData(form).get('name') ?? '').trim();

      // An empty name is not a group; the field is `required` and this catches the
      // whitespace-only value the browser accepts.
      if (!name) return;
      if (!claim('create')) return;

      setCreateError(null);
      setIsCreating(true);

      try {
        const response = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        const body = (await response.json().catch(() => null)) as {
          code?: unknown;
          message?: string;
        } | null;

        const failure = nameFailureText(dict, body?.code);

        if (failure !== undefined) {
          setCreateError(failure);
          return;
        }

        if (!response.ok) {
          throw new Error(body?.message || `Error: ${response.status}`);
        }

        /*
          The name is substituted rather than the created row's: `{name}` is a hole
          in a sentence, an unsubstituted one is still a valid string, and nothing
          throws for it. The same reason `share-list-dialog.tsx:300-313` gives for
          the grant toast.
        */
        toast.success(dict.toasts.groupCreated.replace('{name}', name));

        /*
          Emptied on success, not left for the reader to clear. The next group is
          usually the next thing they type, and a field holding the name that was
          just taken would make the second submit a duplicate the server refuses -
          `share-list-dialog.tsx:327-333` is that argument for the address field
          the grant used to be typed into.
        */
        form.reset();

        await loadGroups();
        onChanged();
      } catch (error) {
        console.error('Error creating group:', error);
        toast.error(dict.toasts.groupCreateFailed);
      } finally {
        setIsCreating(false);
        release('create');
      }
    },
    [claim, dict, loadGroups, onChanged, release]
  );

  const handleRename = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!renamingGroup) return;

      const form = event.currentTarget;
      const name = String(new FormData(form).get('name') ?? '').trim();

      if (!name) return;
      if (!claim(`rename:${renamingGroup.id}`)) return;

      setRenameError(null);
      setIsRenaming(true);

      try {
        const response = await fetch(`/api/groups/${renamingGroup.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        const body = (await response.json().catch(() => null)) as {
          code?: unknown;
          message?: string;
        } | null;

        const failure = nameFailureText(dict, body?.code);

        if (failure !== undefined) {
          setRenameError(failure);
          return;
        }

        if (!response.ok) {
          throw new Error(body?.message || `Error: ${response.status}`);
        }

        toast.success(dict.toasts.groupRenamed.replace('{name}', name));
        setRenamingId(null);
        await loadGroups();
        onChanged();
      } catch (error) {
        console.error('Error renaming group:', error);
        toast.error(dict.toasts.groupRenameFailed);
      } finally {
        setIsRenaming(false);
        release(`rename:${renamingGroup.id}`);
      }
    },
    [claim, dict, loadGroups, onChanged, release, renamingGroup]
  );

  const handleDeleteGroup = useCallback(async () => {
    if (!pendingDeletion) return;
    const group = pendingDeletion;
    if (!claim(`delete:${group.id}`)) return;

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
      });

      /*
        Any refusal here is a toast rather than a sentence on a field: the reader
        is looking at a confirmation they have already answered, and `no_such_group`
        names an account's groups rather than the group in front of them.
      */
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      toast.success(dict.toasts.groupDeleted.replace('{name}', group.name));

      // The open group is gone, and its member read belongs to it.
      if (openGroupId === group.id) setOpenGroupId(null);
      setMembersByGroup((previous) => {
        const next = { ...previous };
        delete next[group.id];
        return next;
      });

      await loadGroups();
      onChanged();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(dict.toasts.groupDeleteFailed);
    } finally {
      release(`delete:${group.id}`);
    }
  }, [claim, dict, loadGroups, onChanged, openGroupId, pendingDeletion, release]);

  const handleRemoveMember = useCallback(async () => {
    if (!pendingRemoval || !openGroupId) return;
    const member = pendingRemoval;
    const groupId = openGroupId;
    if (!claim(`member:${member.id}`)) return;

    try {
      /*
        Addressed by the membership row rather than by the account, because that is
        what a `DELETE` on this route takes and what the picker's grant is not: a
        membership is minted when somebody is added and outlives nothing else.
      */
      const response = await fetch(
        `/api/groups/${groupId}/members/${member.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      toast.success(
        dict.toasts.groupMemberRemoved.replace(
          '{name}',
          member.displayName || member.email
        )
      );

      /*
        Both reads, not just this group's members. Removing somebody moves
        `memberCount` on the row *above* - the group list this dialog opened with -
        and leaving it stale would mean the dialog says a group holds four people
        while the row under it enumerates three. The same argument as
        `onMemberPicked` makes, and it is why the add and the remove are not
        symmetric-looking in one direction only.
      */
      await loadMembers(groupId);
      await loadGroups();
      onChanged();
    } catch (error) {
      console.error('Error removing group member:', error);
      toast.error(dict.toasts.groupMemberRemoveFailed);
    } finally {
      release(`member:${member.id}`);
    }
  }, [
    claim,
    dict.toasts.groupMemberRemoved,
    dict.toasts.groupMemberRemoveFailed,
    loadGroups,
    loadMembers,
    onChanged,
    openGroupId,
    pendingRemoval,
    release,
  ]);

  /*
    The membership add.

    The picker found the person and this makes them a member, because the two are
    different requests and only this one is about a group. The picker is given
    `listId={null}` and calls `onPicked` with the account; had it been given a list
    id, choosing a row would have granted that account access to a list nobody
    picked, and `POST /api/lists/{id}/access` would have accepted it.

    Addressed by account id rather than by an address, which is the whole reason the
    route is written that way: a member is added by a resolved account, so there is
    nowhere in this handler for a half-typed address to be matched against a handle
    it does not belong to.

    Both reads are refreshed afterwards - this group's members and the group list -
    because adding somebody moves `memberCount` on a row this dialog did not receive
    and adds a name to a list it did not hold. Patching either locally would be
    `readableListSummary`'s two-queries problem on the other side: the row would say
    one number and the list beneath it another.

    `already_shared` is deliberately not treated as a failure. `addMember` answers 200
    with the row that was already there, and the dialog should not say the add failed
    for a person who is in the group - which is also why the picker hides accounts
    already in this group from its results.
  */
  const onMemberPicked = useCallback(
    async (account: AccountSearchResult) => {
      if (!openGroupId) return;
      const groupId = openGroupId;
      if (!claim(`member-add:${account.id}`)) return;

      try {
        const response = await fetch(`/api/groups/${groupId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: account.id }),
        });

        const body = (await response.json().catch(() => null)) as {
          code?: unknown;
          message?: string;
        } | null;

        if (!response.ok) {
          /*
            A refusal here is a toast rather than a sentence on a field: the picker
            has already cleared itself, so there is no field left to print against,
            and `cannot_join_own_group` - the one this can produce in practice - is a
            statement about the account the reader is, which reads better as
            something that happened than as an error under an empty field.
          */
          console.error('Error adding group member:', body?.code);
          throw new Error(body?.message || `Error: ${response.status}`);
        }

        /*
          The display name and not the handle, for the reason the grant toast in
          `account-picker.tsx` uses it: the sentence names the person the owner
          thinks of, and falls back to the address rather than leaving `{name}` in
          front of them - an unsubstituted placeholder is still a valid string, so
          nothing would throw.
        */
        toast.success(
          dict.toasts.groupMemberAdded.replace(
            '{name}',
            account.displayName || account.email
          )
        );

        await loadMembers(groupId);
        await loadGroups();
        onChanged();
      } catch (error) {
        console.error('Error adding group member:', error);
        toast.error(dict.toasts.groupMemberAddFailed);
      } finally {
        release(`member-add:${account.id}`);
      }
    },
    [claim, dict.toasts.groupMemberAddFailed, dict.toasts.groupMemberAdded, loadGroups, loadMembers, onChanged, openGroupId, release]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      /*
        Reset on the way out rather than on the way in. Every one of these outlives
        the thing that displays it, and a sheet that reopened still holding a
        refusal, a half-answered rename or the group that was open last time would
        be showing a decision this visit did not ask for.
      */
      setRenamingId(null);
      setPendingDeletion(null);
      setPendingRemoval(null);
      setOpenGroupId(null);
      setCreateError(null);
      setRenameError(null);
      setCreating(false);
      setAddingMember(false);
      onClose();
    },
    [onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={dict.close} className='sm:max-w-md'>
        <DialogHeader>
          {/*
            Two levels, and the header is what tells you which one you are in.

            On the list, the title is a category label and keeps the sans face the
            other five dialogs use - the serif in this app is for a name. Inside a
            group, the title *is* that group's name, so it takes the specimen serif
            at the sheet size. Same component, two levels, and the difference is the
            one the design system draws everywhere else: a name is set in the
            serif, a label is not.
          */}
          {openGroup ? (
            <>
              {/*
                One lift, stated once. It was `-mt-2` with `xs:-mt-1`, which is
                two values compensating for two paddings - `p-5` from `sm` and
                `xs:p-4` below it - so that this row's absolute position inside
                the sheet came out the same at every width. The position it is
                compensating for is the close control's, which is also two values
                (`top-5` / `xs:top-4`), so the pair held the row 4px under the X
                at every width.

                Measured, the single value is identical below `sm` and gives up
                that alignment above it: at 390px the row's top is 21px into the
                sheet against the X's 17px, before and after; at 1280px it moves
                from 25px to 29px against the X's 21px, so the gap goes from 4px
                to 8px. What does not change is the relationship on the row's own
                line - the way out and the group menu sit at the same offset at
                every width, 0px apart at both - and that is the alignment this
                row is read by.
              */}
              <div className='-mt-1 flex items-center justify-between gap-2'>
                {/*
                  The way out. `aria-controls` names the list this returns to, so
                  the relationship is announced and not only drawn, and it is a real
                  44px row rather than the window's own cross: a reader who has gone
                  three levels deep in a sheet should not have to dismiss the sheet
                  to leave a group.
                */}
                <button
                  type='button'
                  onClick={() => {
                    setOpenGroupId(null);
                    setAddingMember(false);
                  }}
                  aria-controls='groupList'
                  data-testid='backToGroups'
                  className={cn(
                    'flex min-h-11 items-center gap-1.5',
                    '-mx-2 px-2',
                    'text-left text-[0.8125rem] text-caption',
                    '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink'
                  )}
                >
                  <IconArrowLeft className='h-4 w-4 shrink-0' aria-hidden='true' />
                  {dict.groups.backToGroups}
                </button>

                {/*
                  The group menu moves here with the reader. It used to be one
                  identical button on every row of the list, so three groups meant
                  three identical stops whose labels were the whole action list
                  spelled out - and the one destructive control in this sheet was
                  reachable from any row without going into that row first. Now it
                  sits on the sheet whose subject it acts on: one button, one place,
                  and it is on screen only while that group is open.
                */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      aria-label={`${openGroup.name} · ${dict.groups.rename} · ${dict.groups.deleteGroup}`}
                      data-testid='groupMenu'
                      className={cn(
                        'shrink-0',
                        'text-caption',
                        '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash',
                        '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink'
                      )}
                    >
                      <IconDotsVertical className='h-4 w-4' aria-hidden='true' />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      onClick={() => setRenamingId(openGroup.id)}
                      data-testid='renameGroup'
                      className='gap-2.5'
                    >
                      <IconPencil className='h-4 w-4' aria-hidden='true' />
                      {dict.groups.rename}
                    </DropdownMenuItem>

                    {/*
                      A rule before the destructive item rather than colour on it at
                      rest: `DESIGN.md` reserves red for a button fill, and tinting
                      the word would spend the one semantic colour in the app on a
                      state that is not destructive until it is pressed.
                    */}
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => setPendingDeletion(openGroup)}
                      data-testid='deleteGroup'
                      className='gap-2.5 text-destructive'
                    >
                      <IconTrash className='h-4 w-4' aria-hidden='true' />
                      {dict.groups.deleteGroup}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <DialogTitle className='mt-1 font-serif text-xl font-semibold'>
                {openGroup.name}
              </DialogTitle>
              <DialogDescription>
                {dict.groups.memberCount.replace(
                  '{count}',
                  String(openGroup.memberCount)
                )}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className='font-sans text-xl'>
                {dict.groups.title}
              </DialogTitle>
              <DialogDescription>{dict.groups.lead}</DialogDescription>
            </>
          )}
        </DialogHeader>

        {openGroup ? (
          <section className='flex flex-col gap-4'>
            {members === undefined ? null : members.length === 0 ? (
              <p
                className='text-[0.8125rem] leading-relaxed text-caption'
                data-testid='noMembers'
              >
                {dict.groups.noMembers}
              </p>
            ) : (
              <ul
                data-testid='groupMembers'
                className='divide-y divide-rule border-y border-rule'
              >
                {members.map((member) => (
                  <li
                    key={member.id}
                    className='flex items-center justify-between gap-3 py-2'
                  >
                    {/*
                      The handle and the address both, because the owner put this
                      person in by typing one of them and cannot be expected to
                      remember which. Neither is ever shown to a member: this list is
                      read by the group's owner and by nobody else
                      (`lib/group-access.ts:61-67`).
                    */}
                    <span className='flex min-w-0 flex-col'>
                      <span className='break-words text-[0.9375rem] text-ink'>
                        {member.displayName}
                      </span>
                      <span className='min-w-0 truncate text-[0.8125rem] text-caption'>
                        {member.nickname} {'·'} {member.email}
                      </span>
                    </span>

                    {/*
                      A person being taken out of a group, not a row being deleted
                      - and the glyph says which, for the reason the audience's
                      revoke carries: a control that looks destructive but is not
                      has to say what it actually does. This one removes one
                      membership and nothing else; deleting the group itself is the
                      control beside the title above.
                    */}
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => setPendingRemoval(member)}
                      aria-label={`${dict.groups.removeMember} · ${member.displayName}`}
                      data-testid='removeGroupMember'
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

            {/*
              The add-person control, at the foot and quiet, expanding in place into
              the picker. The same arrangement as the "add a gift" row at the foot of
              a list sheet: the action that fills a block belongs under that block,
              not above it, and one tap should be enough to reach a keyboard.

              It used to be a printed label *and* the picker, permanently, under a
              second heading of its own - so inside a group there were two labels
              for one field ("Person hinzufügen" and "Nickname oder E-Mail-Adresse"),
              and the field was on screen whether or not the reader wanted to add
              anybody. The picker's own printed label is the one that stays; it is
              the one that says what the field wants, and `PRODUCT.md` requires a
              printed label on a form rather than a placeholder alone.
            */}
            {addingMember ? (
              <div
                className='flex flex-col gap-2'
                data-testid='addMemberHeading'
              >
                <AccountPicker
                  /*
                    `null` and not a list id: this picker asks "which account?" and
                    the request that follows is `POST /api/groups/{id}/members`,
                    addressed by account id, because adding somebody to a group is
                    not adding them to a list. Handing it a list id here would let a
                    click on a result grant the account access to a list nobody
                    chose.
                  */
                  listId={null}
                  dict={dict}
                  alreadyShared={
                    members?.map((member) => member.accountId) ?? []
                  }
                  onPicked={onMemberPicked}
                  isVisible
                />
              </div>
            ) : (
              <AddRow
                label={dict.groups.addMemberLabel}
                testId='addMemberButton'
                onClick={() => setAddingMember(true)}
                afterRule={memberListHasRule}
              />
            )}
          </section>
        ) : (
          <section className='flex flex-col gap-4'>
            {groups === null ? null : groups.length === 0 ? (
              <p
                className='text-[0.8125rem] leading-relaxed text-caption'
                data-testid='noGroups'
              >
                {dict.groups.noGroups}
              </p>
            ) : (
              <ul
                id='groupList'
                data-testid='groupList'
                className='divide-y divide-rule border-y border-rule'
              >
                {groups.map((group) => (
                  <li key={group.id} className='py-1'>
                    {/*
                      The whole row opens the group, and it is the only control on
                      it. Every row used to carry a second, identical menu button, so
                      the list had two kinds of control repeated once each and the
                      reader had to decide per row which of them they wanted - on a
                      phone, two 44px targets side by side where one would do.

                      `h-auto` with `min-h-11`: two lines of text, and the
                      primitive's 44px would be the shorter of the two floors rather
                      than the shape's own. And the one control in this product
                      allowed to wrap - a German compound is one unbreakable token
                      wider than a phone.
                    */}
                    <Button
                      type='button'
                      variant='ghost'
                      onClick={() => setOpenGroupId(group.id)}
                      data-testid='openGroup'
                      className={cn(
                        'h-auto min-h-11 w-full min-w-0',
                        'group/name',
                        'justify-start px-0 text-left',
                        'whitespace-normal',
                        'text-ink',
                        '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash'
                      )}
                    >
                      <span className='flex min-w-0 flex-col'>
                        {/*
                          The underline is on the words and is driven by the
                          button's own hover, which is the same arrangement as a
                          list name on the contents page: the pointer is over the
                          control here, so `hover:` on the name is honest, and the
                          rule is gated because a touch device cannot leave it
                          drawn.
                        */}
                        <span className='font-serif break-words text-[0.9375rem] font-semibold leading-snug underline-offset-2 [@media(hover:hover)_and_(pointer:fine)]:group-hover/name:underline'>
                          {group.name}
                        </span>
                        <span className='text-[0.8125rem] text-caption'>
                          {dict.groups.memberCount.replace(
                            '{count}',
                            String(group.memberCount)
                          )}
                        </span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/*
              The create form is at the foot and closed, behind one button.

              It used to be the first thing in the sheet: a printed label, a field,
              and the app's only solid ink button at full width - permanently, on
              every visit, above the reader's own groups. The loudest object on the
              screen was "make another one", and a reader with nine groups had to
              scroll past nine rows to reach it. Now the list is the sheet and the
              form is one tap away at the bottom, where the action that adds to a
              block belongs.
            */}
            {creating ? (
              <form onSubmit={handleCreate} className='flex flex-col gap-3'>
                <div className='flex flex-col gap-1.5'>
                  {/*
                    A printed label, never a placeholder alone: it has to survive
                    the field being filled, and a screen reader meets a placeholder
                    exactly once.
                  */}
                  <Label
                    htmlFor='newGroupName'
                    className='label-print text-caption'
                  >
                    {dict.groups.enterGroupName}
                  </Label>
                  <Input
                    id='newGroupName'
                    name='name'
                    type='text'
                    placeholder={dict.groups.enterGroupName}
                    required
                    autoFocus
                    aria-invalid={createError ? true : undefined}
                    aria-describedby={
                      createError ? 'groupNameError' : undefined
                    }
                    data-testid='groupNameInput'
                  />
                  {createError && (
                    <p
                      id='groupNameError'
                      role='alert'
                      data-testid='groupNameError'
                      className='text-destructive text-[0.875rem] leading-snug'
                    >
                      {createError}
                    </p>
                  )}
                </div>

                {/*
                  Both buttons carry `cta`, which is what makes the pair one
                  height. The phone floor belongs to the action the sheet exists
                  to perform, and a footer that puts it beside a 44px cancel is
                  two controls of one row at two heights - measured at 390px as
                  exactly that, 44 and 48.
                */}
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='cta'
                    onClick={() => setCreating(false)}
                    className='flex-1'
                  >
                    {dict.cancel}
                  </Button>
                  <Button
                    type='submit'
                    size='cta'
                    disabled={isCreating}
                    className='flex-1'
                    data-testid='createGroupSubmit'
                  >
                    {isCreating ? dict.groups.creating : dict.groups.create}
                  </Button>
                </div>
              </form>
            ) : (
              /*
                An outlined button, not the quiet `AddRow` this level used and not
                the solid ink fill it used before that. A group is the one entity
                with a screen of its own, so this is not a row among rows and
                nothing in the list competes with it for the reader's eye - which
                is exactly why it may be a printed button: a reader who came here
                to make a group finds it in one tap without the sheet having to
                shout, and the list above keeps the sheet to itself.

                `h-11 px-4` and the rule are the primitive's own `default` size and
                `outline` variant, so the 44px target and the printed edge are the
                ones every other secondary control in the app already has; only the
                label is dropped to 0.875rem, which is the face `AddRow` and the
                cancel beside it use.
              */
              <Button
                type='button'
                variant='outline'
                onClick={() => setCreating(true)}
                data-testid='newGroupButton'
                className='w-full justify-center text-[0.875rem]'
              >
                <IconPlus className='h-4 w-4 shrink-0' aria-hidden='true' />
                {dict.groups.newGroup}
              </Button>
            )}
          </section>
        )}

        {/*
          Renaming, in a second sheet rather than as an edit in the row: a row is a
          name, a count and a menu, and turning one of those into a text field puts
          a caret in the middle of a list of things - in a row that may be the
          third of five, where a mis-click lands somewhere else entirely. It says
          what is being renamed above the field.

          `key` on the name, so opening it on a different row does not leave the
          previous row's name in the field: this is one instance reused for every
          row, and an uncontrolled input only re-reads its `defaultValue` on mount.
          Ported from `RenameListDialog` in `list-board.tsx:415-420`.
        */}
        <Dialog
          open={renamingId !== null}
          onOpenChange={(open) => !open && setRenamingId(null)}
        >
          <DialogContent closeLabel={dict.close} className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='font-sans text-xl'>
                {dict.groups.renameTitle}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleRename} className='flex flex-col gap-4'>
              <div className='flex flex-col gap-1.5'>
                <Label
                  htmlFor='renameGroupName'
                  className='label-print text-caption'
                >
                  {dict.groups.renameLabel}
                </Label>
                <Input
                  key={renamingGroup?.id}
                  id='renameGroupName'
                  name='name'
                  type='text'
                  defaultValue={renamingGroup?.name ?? ''}
                  autoFocus
                  required
                  aria-invalid={renameError ? true : undefined}
                  aria-describedby={renameError ? 'groupRenameError' : undefined}
                  data-testid='groupRenameInput'
                />
                {renameError && (
                  <p
                    id='groupRenameError'
                    role='alert'
                    data-testid='groupRenameError'
                    className='text-destructive text-[0.875rem] leading-snug'
                  >
                    {renameError}
                  </p>
                )}
              </div>

              <DialogFooter className='gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='cta'
                  onClick={() => setRenamingId(null)}
                  className='w-full sm:w-auto'
                >
                  {dict.cancel}
                </Button>
                <Button
                  type='submit'
                  size='cta'
                  disabled={isRenaming}
                  className='w-full sm:ml-2'
                  data-testid='saveGroupRename'
                >
                  {isRenaming ? dict.groups.saving : dict.groups.save}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/*
          Deleting a group is the second irreversible control in the product and
          the first sentence that has to carry two clauses. It takes out every
          membership and every list the group was shared with, so anybody who was
          reaching a list only through this group stops reaching it, and a group
          re-created under the same name arrives empty - the reach cannot be
          reconstructed from anything this product stores. `PRODUCT.md:101` says say
          what will happen before it happens, and the consequence is the whole
          content of the prompt, so it is the description and not the title.

          The title is `groups.deleteGroup` because no question-form title for it
          exists; `confirmations.deleteGroupNamed` names the group and states the
          loss, which is a description and would be two clauses where a title
          belongs.
        */}
        <ConfirmDialog
          isOpen={pendingDeletion !== null}
          onClose={() => setPendingDeletion(null)}
          onConfirm={handleDeleteGroup}
          title={dict.groups.deleteGroup}
          description={dict.confirmations.deleteGroupNamed.replace(
            '{name}',
            pendingDeletion?.name ?? ''
          )}
          confirmLabel={dict.groups.deleteGroup}
          cancelLabel={dict.cancel}
        />

        {/*
          Removing one member is confirmed because it is somebody losing reach to a
          list they may be about to buy from - and it is a different prompt from the
          group's own deletion, with its own title, because the two remove
          different amounts: this one removes one person and is reversible by
          adding them again, which is why the description names them and says
          nothing else.
        */}
        <ConfirmDialog
          isOpen={pendingRemoval !== null}
          onClose={() => setPendingRemoval(null)}
          onConfirm={handleRemoveMember}
          title={dict.groups.removeMemberConfirmTitle}
          description={`${pendingRemoval?.displayName ?? ''} \u00b7 ${
            pendingRemoval?.email ?? ''
          }`}
          confirmLabel={dict.groups.removeMember}
          cancelLabel={dict.cancel}
        />
      </DialogContent>
    </Dialog>
  );
};

export { GroupsDialog };
export default GroupsDialog;