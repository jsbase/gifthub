'use client';

import React, { memo, useCallback, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ListVisibilityDialog } from '@/components/share-list-dialog';
import ListRow from '@/components/list-row';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type {
  ListBoardProps,
  ListSummary,
  ListVisibility,
  Translations,
} from '@/types';

/**
 * The contents page: two lists of lists.
 *
 * **The two sections are two different relationships, and that is why they are
 * two sections.** "Your lists" is everything this account owns; "shared with you"
 * is everything other people decided this account could read. The old board had
 * one list of members, because in the old product there was one relationship -
 * everybody in the group could read everybody's sheet - and now there are two, so
 * a row's owner-only controls have to be knowable per row rather than per page.
 * They are: `ListRow` renders a control only when the handler was passed, and the
 * board passes the owner handlers only for a list it owns.
 *
 * A shared list is shown with the owner's name under its name, because two people
 * can own lists called the same thing and that name is not what identifies one.
 *
 * **The board owns two mutations and hands two others up.** Rename and change
 * visibility happen here, because `ListRowProps.busyId` is the only place a row
 * can be told that its own request is in flight and that prop can only be fed
 * from this component's state - so the request and the row that dims for it have
 * to live in the same place. Deleting a list and creating one are the page's: a
 * deletion is irreversible and cascades to every idea on the sheet, and the
 * confirmation and the request belong together on the page that has to say
 * something afterwards.
 *
 * The dictionary it reads is `listBoard.*` rather than the identical top-level
 * keys. Those top-level keys are the pages' copy - the page is what shows the
 * delete confirmation - and a page's sentence and its own board's sentence
 * drifting apart is the same defect `types.ts` exists to prevent.
 */
const ListBoard: React.FC<ListBoardProps> = ({
  lists,
  shared,
  dict,
  onOpenList,
  onCreateList,
  onShareList,
  onDeleteList,
  onListChanged,
}) => {
  /*
    Two dialogs and the row each of them is mutating. Not a map of open dialogs:
    there is exactly one rename and one visibility chooser on the page, and each
    belongs to one row, so each is one id and one flag.
  */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [visibilityId, setVisibilityId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rename = useCallback(
    async (listId: string, name: string) => {
      setBusyId(listId);
      try {
        const response = await fetch(`/api/lists/${listId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) throw new Error('Failed to rename list');

        toast.success(dict.toasts.listRenamed);
        setRenamingId(null);
        onListChanged();
      } catch {
        toast.error(dict.toasts.listRenameFailed);
      } finally {
        setBusyId(null);
      }
    },
    [dict.toasts.listRenameFailed, dict.toasts.listRenamed, onListChanged]
  );

  const changeVisibility = useCallback(
    async (listId: string, visibility: ListVisibility) => {
      setBusyId(listId);
      try {
        const response = await fetch(`/api/lists/${listId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visibility }),
        });

        if (!response.ok) throw new Error('Failed to change visibility');

        toast.success(dict.toasts.visibilityChanged);
        setVisibilityId(null);
        onListChanged();
      } catch {
        toast.error(dict.toasts.visibilityChangeFailed);
      } finally {
        setBusyId(null);
      }
    },
    [
      dict.toasts.visibilityChangeFailed,
      dict.toasts.visibilityChanged,
      onListChanged,
    ]
  );

  const visibilityList = lists.find((list) => list.id === visibilityId) ?? null;

  return (
    <div className='flex flex-col'>
      <section className='flex flex-col'>
        <SectionHead
          label={dict.listBoard.yourLists}
          action={
            <Button
              variant='outline'
              onClick={onCreateList}
              className='justify-center text-[0.875rem]'
              data-testid='createListButton'
            >
              <IconPlus className='h-4 w-4' aria-hidden='true' />
              {dict.listBoard.createList}
            </Button>
          }
        />

        {lists.length > 0 ? (
          <ul data-testid='ownedLists' className='divide-y divide-rule'>
            {lists.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                dict={dict}
                busyId={busyId}
                onOpen={onOpenList}
                onShare={onShareList}
                onRename={setRenamingId}
                onChangeVisibility={setVisibilityId}
                onDelete={onDeleteList}
              />
            ))}
          </ul>
        ) : (
          /*
            Two distinct ids rather than one: the two empty states are different
            sentences about two different relationships, and an end-to-end assertion
            that pinned a single name would pass on whichever section happened to
            render first.
          */
          <EmptyState
            message={dict.listBoard.noLists}
            testId='noLists'
          />
        )}
      </section>

      {/*
        The second section is not conditional on having rows: an owner with five
        lists and no invitations needs to be told the section is empty rather than
        left to wonder whether it exists at all. It does not carry the create
        control - there is nothing to create here.
      */}
      <section className='mt-8 flex flex-col'>
        <SectionHead label={dict.listBoard.sharedWithYou} />

        {shared.length > 0 ? (
          <ul data-testid='sharedLists' className='divide-y divide-rule'>
            {shared.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                dict={dict}
                busyId={busyId}
                onOpen={onOpenList}
                /*
                  No `onShare`, no `onRename`, no `onChangeVisibility`, no
                  `onDelete` - and that absence is the whole design of this row.
                  An invited account cannot do any of the four, so it is offered
                  none of them, and no handler means no control rather than an
                  inert one.
                */
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            message={dict.listBoard.noSharedLists}
            testId='noSharedLists'
          />
        )}
      </section>

      <RenameListDialog
        isOpen={renamingId !== null}
        dict={dict}
        list={lists.find((list) => list.id === renamingId) ?? null}
        busy={busyId === renamingId}
        onClose={() => setRenamingId(null)}
        onSave={rename}
      />

      {visibilityList && (
        <ListVisibilityDialog
          isOpen={visibilityId !== null}
          onClose={() => setVisibilityId(null)}
          visibility={visibilityList.visibility}
          dict={dict}
          onSelect={(next) => changeVisibility(visibilityList.id, next)}
        />
      )}
    </div>
  );
};

/**
 * A printed section label and the one control that belongs to it.
 *
 * A label rather than a page heading, ported from the contents sheet this
 * replaces: on a contents page the lists themselves are the thing worth looking
 * at, and a large heading above them made the rows read as the caption to a
 * title. The action sits beside it from `sm` up and under it below, because at
 * 390px a German and a Russian label do not fit on one line each.
 */
const SectionHead: React.FC<{ label: string; action?: React.ReactNode }> = ({
  label,
  action,
}) => (
  <div
    className={cn(
      'flex',
      'flex-col',
      'gap-4',
      'border-b',
      'border-rule',
      'pb-4',
      'sm:flex-row',
      'sm:items-end',
      'sm:justify-between',
      'sm:gap-6'
    )}
  >
    <h2 className='label-print pt-1 text-caption'>{label}</h2>
    {action}
  </div>
);

/**
 * Nothing here yet.
 *
 * Dashed, and for the reason the empty cell on a list's sheet is dashed: a solid
 * rule means there is a row and a dashed one means there is room for one. The
 * old board used the same rectangle for "no members", where the room was for a
 * name; here it is the room for a list.
 */
const EmptyState: React.FC<{ message: string; testId: string }> = ({
  message,
  testId,
}) => (
  <p
    className={cn(
      'max-w-[44ch]',
      'border',
      'border-dashed',
      'border-rule',
      'px-5',
      'py-8',
      'text-[0.9375rem]',
      'leading-relaxed',
      'text-caption'
    )}
    data-testid={testId}
  >
    {message}
  </p>
);

/**
 * Renaming a list, which is one field and one button.
 *
 * A dialog rather than an inline edit in the row: a row is a name, a figure and
 * four controls, and turning one of those into a text field would change the
 * row's height and put a caret in the middle of a list of things - and it would
 * do it in a row that may be the third of five, where a mis-click lands somewhere
 * else entirely. The dialog states what is being renamed above the field.
 *
 * Its prop type is written out here rather than added to `types.ts`, which is
 * frozen for this change and has no interface for this dialog.
 */
const RenameListDialog: React.FC<{
  isOpen: boolean;
  dict: Translations;
  list: ListSummary | null;
  busy: boolean;
  onClose: () => void;
  onSave: (listId: string, name: string) => void;
}> = ({ isOpen, dict, list, busy, onClose, onSave }) => {
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!list) return;

      const formData = new FormData(e.currentTarget);
      const name = String(formData.get('name') ?? '').trim();

      /*
        An empty name is not a rename, it is an erasure, and the server has no
        rule about it. The field is `required` so the browser catches the empty
        case, and this catches the whitespace-only one the browser accepts.
      */
      if (!name) return;

      onSave(list.id, name);
    },
    [list, onSave]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={dict.close} className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='font-sans text-xl'>
            {dict.listBoard.renameTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='listName' className='label-print text-caption'>
              {dict.listBoard.renameLabel}
            </Label>
            {/*
              `key` on the name, so opening the dialog on a different row does
              not leave the previous row's name in the field. The dialog is one
              instance reused for every row on the page, and an uncontrolled input
              only re-reads its `defaultValue` on mount.
            */}
            <Input
              key={list?.id}
              id='listName'
              name='name'
              type='text'
              defaultValue={list?.name ?? ''}
              autoFocus
              required
            />
          </div>

          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              className='w-full sm:w-auto'
            >
              {dict.cancel}
            </Button>
            <Button
              type='submit'
              disabled={busy}
              className={cn('w-full', 'xs:h-12', 'xs:text-base', 'sm:ml-2')}
              data-testid='renameListSubmit'
            >
              {busy ? dict.listBoard.saving : dict.listBoard.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default memo(ListBoard);