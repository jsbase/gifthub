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

  /*
    **Which section comes first, and why it is not fixed.**

    For a reader who owns nothing, the order that puts "your lists" first prints a
    113px blank plate and a create button above the one row they came for. Measured
    on a phone at 390x844 with the seed's Mia - who owns nothing and was given
    Ben's birthday list - her row began 350.5px down, 41.5% of the viewport, with
    350.5px of it visible. The persona this state is built for is the likeliest one
    in the product: a person who was *given* a list. Putting their list second
    behind an invitation to go and write their own is a priority inversion, not a
    layout preference.

    So the order is a product judgement and it is stated in one line rather than
    spread through the markup: when there is nothing of your own and something
    somebody gave you, the thing somebody gave you comes first. With anything of
    your own present the sections keep the order they have always had, because then
    "your lists" is a real list and putting an invitation above five rows would be
    the same mistake pointed the other way.
  */
  const sharedFirst = lists.length === 0 && shared.length > 0;

  const ownSection = (
    <section className='flex flex-col gap-6' data-testid='ownSection'>
      <SectionHead
        heading={!sharedFirst}
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
        /* `divide-y`, and it is a ruled index rather than a floating one. This was
           removed on the argument that a hairline between two rows of one section
           claims they are two sections - which is true, and costs more than it saves.
           The section head's rule sits *under* the label and therefore directly above
           the first row, so the two lines are 16px apart and about different things;
           the hairline between rows 2 and 3 is a hundred pixels from any head. A
           printed index rules its rows and it reads as one. */
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

          This plate is the create control on an empty board, which is why the head's
          button and this cannot both be there. Two controls for one action is the
          same defect as an inert one.
        */
        <CreatePlate dict={dict} onCreate={onCreateList} />
      )}
    </section>
  );

  const sharedSection = (
    /*
      The second section is not conditional on having rows: a reader with five
      lists and no invitations needs to be told the section is empty rather than
      left to wonder whether it exists at all. It does not carry the create
      control - there is nothing to create here.
    */
    <section className='flex flex-col gap-6' data-testid='sharedSection'>
      <SectionHead
        heading={sharedFirst}
        label={dict.listBoard.sharedWithYou}
      />

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
        <EmptyNote
          message={dict.listBoard.sharedEmptyNote}
          testId='noSharedLists'
        />
      )}
    </section>
  );

  return (
    /*
      The one `h1` on this route. The header used to carry it - the signed-in
      person's display name - and that made it the document title of every signed-in
      page, which is a person's name rather than a page's, and left the list sheet
      with two `h1` and no `h2` between them. The header now prints that name as a
      paragraph, so each route owns its own heading and this one can say what the
      page is for rather than who is looking at it.
    */
    <div className='flex flex-col gap-8'>
      <h1 className='sr-only'>{dict.listBoard.yourLists}</h1>

      {sharedFirst ? (
        <>
          {sharedSection}
          {ownSection}
        </>
      ) : (
        <>
          {ownSection}
          {sharedSection}
        </>
      )}

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
const SectionHead: React.FC<{
  label: string;
  action?: React.ReactNode;
  /**
   * This label is the page's heading rather than a label above a run of rows, so it
   * draws no rule and takes no bottom padding.
   *
   * The section mark belongs to a section label. A heading that owns a hairline says
   * "a block starts here", which is not what a heading says - and the first label on
   * this page is the one line that says what the page is, with nothing above it to
   * separate from in any case.
   *
   * Passed rather than inferred from a CSS :first-child selector, because which label is the
   * heading is not a question about the DOM: a reader who owns nothing is shown
   * "Wünsche deiner Liebsten" first, and on that page *that* is the heading.
   */
  heading?: boolean;
}> = ({ label, action, heading = false }) => (
  <div
    className={cn(
      'flex',
      'flex-col',
      'gap-4',
      'border-b',
      'border-rule',
      'pb-4',
      /*
        Under the head, not over it. A rule above a label is the right mark when there
        is a block above it to be separated from - which is the list sheet's case and
        not this one. Here the first section sits at the top of the sheet with nothing
        over it, so a rule over the label drew a line across an empty margin, and a
        rule over a 44px button is a statement about the button that the button never
        made.
      */
      /*
        And a heading takes neither the rule nor the padding under it, so the distance
        from the heading to the first row is the section's own gap and not the sum of
        the two.
      */
      heading && 'border-b-0',
      heading && 'pb-0',
      'sm:flex-row',
      'sm:items-end',
      'sm:justify-between',
      'sm:gap-6'
    )}
  >
    {/*
      The same label face for both labels, and the same size. The page's heading is
      not set larger than its second section label: this is an album index, and the
      rows underneath it are the thing worth looking at - a 32px heading above a list
      of names makes the names read as captions to a title, which is the exact
      failure the original note on this component warned about.
    */}
    <h2 className='label-print pt-1 text-caption'>{label}</h2>

    {/*
      The create button, at the size and weight it always had: a 44px outline on the
      right end of the head. It briefly became a quiet ghost row at the foot of the
      section, which read as tidier and was worse - on a board with no lists the
      plate is already the control, and on a board with lists this is the one thing
      anybody came to do. A quiet row for it says it does not matter.
    */}
    {action}
  </div>
);

/**
 * The empty board's blank plate, and it is the control.
 *
 * The same arrangement an empty list sheet uses for its blank cell, and for the
 * same reason: a printed rule means there is a row and a dashed one means there
 * is room for one, and the only thing you can do with room for a row is make it.
 * So the whole plate is the target rather than a sentence with a button somewhere
 * else, and the invitation and the action are one object.
 *
 * This used to be a `<p>` in a dashed box reading "Lege deine erste Wunschliste
 * an." - an imperative in a shape that looks pressable, with the one working
 * control 60px above it and 570px to the right. It is the first thing every new
 * account sees, and the emptiest the product can be, and it was the largest
 * object on the sheet carrying no action at all.
 *
 * The hint is what earns the plate: without a second line saying what actually
 * goes in, a large dashed rectangle with a sentence in it is a wall.
 */
const CreatePlate: React.FC<{ dict: Translations; onCreate: () => void }> = ({
  dict,
  onCreate,
}) => (
  <button
    type='button'
    onClick={onCreate}
    data-testid='noLists'
    className={cn(
      // Full content width, for the reason the sheet's blank cell is: a row on
      // this page is full content width, and a plate that stopped two thirds of
      // the way across would be a different shape from the row it stands for.
      'flex w-full flex-col items-start gap-2.5',
      'border',
      'border-dashed',
      'border-rule',
      'px-5',
      'py-7',
      'text-left',
      // Gated on a real pointer, as every other hover affordance in this product
      // is: a touch device that can reach this button cannot hover it, and an
      // unhoverable target that repaints on tap is the tap-to-nothing pattern.
      '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash',
      'rounded-md'
    )}
  >
    {/* The invitation, in ink rather than in caption. On an empty board this
        sentence is the entire content of the section, and it was set at the same
        weight as the section head above it. */}
    <span
      className={cn(
        'text-[0.9375rem]',
        'leading-relaxed',
        'text-pretty',
        'text-ink'
      )}
    >
      {dict.listBoard.noLists}
    </span>

    {/* What actually goes in, and who decides who sees it. Not `aria-hidden`
        any more: it used to be, on the grounds that it restated what the dialog
        it opens labels field by field - which was true of the old wording and is
        not true of this one. It is the product's promise, in one sentence, and the
        sentence somebody using a screen reader most needs is the one about not
        having to decide about privacy before they have written anything down. */}
    <span className='text-[0.8125rem] leading-relaxed text-caption'>
      {dict.listBoard.emptyPlateHint}
    </span>
  </button>
);

/**
 * Nobody has shared a list with this account. A sentence, and deliberately no
 * plate around it.
 *
 * It used to print the same dashed box as the section above it, which is the one
 * place on this page where the design system's own vocabulary is used against
 * its own meaning: a dashed rule means there is room for a row, and the only
 * thing anybody can do with room for a row in *this* section is wait for
 * somebody else. The sheet's empty state draws the same line - a buyer on an
 * empty list gets the sentence alone - and this is that case.
 *
 * It is set at `meta` rather than at the size the sentence above it used to be,
 * because it is now the only thing in its section rather than the largest object
 * on the sheet, and there is no longer an action for it to compete with.
 *
 * **No measure, and that is the fix.** This carried `max-w-[44ch]`, which is the
 * app's reading measure for prose - and a one-sentence note is not prose. At 13px
 * the measure capped the note at roughly 380px on a sheet whose content column is
 * 910px, so a sentence of sixty-odd characters broke onto two lines with more than
 * half the sheet empty to its right, and read as a layout failure rather than as
 * anything anybody had written. Widening the box is the whole fix: the sentence now
 * takes the sheet's own measure and wraps only where it has to. On a phone the
 * column is 358px and it wraps there, which is correct - a phone is narrow.
 */
const EmptyNote: React.FC<{ message: string; testId: string }> = ({
  message,
  testId,
}) => (
  <p
    className={cn('text-[0.8125rem]', 'leading-relaxed', 'text-pretty', 'text-caption')}
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
              size='cta'
              onClick={onClose}
              className='w-full sm:w-auto'
            >
              {dict.cancel}
            </Button>
            <Button
              type='submit'
              size='cta'
              disabled={busy}
              className='w-full sm:ml-2'
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