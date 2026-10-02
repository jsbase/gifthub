'use client';

import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';
import type { CreateListDialogProps, ListVisibility } from '@/types';

/**
 * The first list, and the one decision that comes with it.
 *
 * Visibility is asked for here rather than inferred from anything, and it is
 * asked for *before* the list exists: the owner states how far the list reaches
 * at the moment they write it down, instead of the list quietly becoming shared
 * the first time somebody is added to it. A list that is shared has no undo
 * button and no pending state - the accounts named on it can read it from that
 * moment - so which of the two it is has to be a decision rather than a
 * consequence.
 *
 * The default is private, and that is the direction that has to be cheap: the
 * list is invisible to anybody else until the owner says otherwise, and every
 * step from there is one the owner takes deliberately.
 *
 * The two choices are printed with their consequences under them, which is the
 * same pair the change-visibility dialog offers later on this list - see
 * `ListVisibilityDialog` in `share-list-dialog.tsx` for why each hint sits under
 * its own option rather than in one sentence at the top of the sheet.
 */
const CreateListDialog: React.FC<CreateListDialogProps> = ({
  isOpen,
  onClose,
  dict,
  onCreated,
}) => {
  const [visibility, setVisibility] = useState<ListVisibility>('PRIVATE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const options = [
    {
      value: 'PRIVATE' as const,
      label: dict.createListDialog.private,
      hint: dict.createListDialog.privateHint,
    },
    {
      value: 'SHARED' as const,
      label: dict.createListDialog.shared,
      hint: dict.createListDialog.sharedHint,
    },
  ];

  /*
    The two choices are a selection, not two switches, and the form is one
    submission: the name and the reach go in together, because a list created
    private and made shared a moment later is a list whose first moment of
    existence was a decision the owner had to undo and redo.
  */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmitting(true);

      const formData = new FormData(e.currentTarget);
      const name = String(formData.get('name') ?? '').trim();

      try {
        const response = await fetch('/api/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, visibility }),
        });

        /*
          Typed at the seam rather than left as `any`. The two shapes below are
          the two ways a create response has been spelled in this product; the
          caller treats an id it cannot find as "a list exists somewhere" and
          re-reads the contents page rather than navigating nowhere.
        */
        const body = (await response.json().catch(() => null)) as {
          id?: string;
          message?: string;
          list?: { id?: string };
        } | null;

        if (!response.ok) {
          throw new Error(body?.message || `Error: ${response.status}`);
        }

        toast.success(dict.toasts.listCreated);
        onCreated(body?.list?.id ?? body?.id ?? '');
      } catch (error) {
        console.error('Error creating list:', error);
        toast.error(dict.toasts.listCreateFailed);
      } finally {
        setIsSubmitting(false);
      }
    },
    [dict.toasts.listCreated, dict.toasts.listCreateFailed, onCreated, visibility]
  );

  /*
    Reset on the way out, not on the way in. The next list an owner creates
    should not open remembering the last one's reach - and the field has no
    `defaultValue`, so an unmounted form starts empty anyway while the radio
    state would have survived a close.
  */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setVisibility('PRIVATE');
      }
      if (!open) onClose();
    },
    [onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent closeLabel={dict.close} className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='font-sans text-xl'>
            {dict.createListDialog.createListTitle}
          </DialogTitle>
          {/*
            The sentence that says what a list is for, and it is the page's copy
            rather than this dialog's: creating a list is the contents page's
            own action, so its description sits with the rest of that page's
            words instead of being restated here.
          */}
          <DialogDescription>{dict.createListDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            {/*
              Visible printed labels, never a placeholder alone: the instruction
              has to survive the field being filled, and a screen reader meets a
              placeholder exactly once.
            */}
            <Label htmlFor='listName' className='label-print text-caption'>
              {dict.createListDialog.enterListName}
            </Label>
            <Input
              id='listName'
              name='name'
              type='text'
              placeholder={dict.createListDialog.enterListName}
              required
              autoFocus
            />
          </div>

          <fieldset className='flex flex-col gap-2'>
            {/*
              A real `fieldset`/`legend`, because these two are alternatives and
              the question is what they mean: one screen reader user has to be
              able to hear "who may see this list" as the group the two answers
              belong to.
            */}
            <legend className='label-print pb-2 text-caption'>
              {dict.createListDialog.visibilityLegend}
            </legend>

            {options.map((option) => {
              const isCurrent = option.value === visibility;
              return (
                <Button
                  key={option.value}
                  type='button'
                  variant={isCurrent ? 'default' : 'outline'}
                  // `aria-pressed` rather than a radiogroup: exactly one of two
                  // values is set, and a radio group would also promise the
                  // arrow-key contract, which a pair of buttons on a form is
                  // the cheaper way not to make.
                  aria-pressed={isCurrent}
                  onClick={() => setVisibility(option.value)}
                  data-testid={`createVisibility-${option.value.toLowerCase()}`}
                  className={cn(
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
          </fieldset>

          {/*
            The 48px floor on the one primary action of a sheet, applied only
            below `sm` where the phone is - the same rule `login-form.tsx:42`
            follows, and `PRODUCT.md` calls a floor rather than a preference.
          */}
          <Button
            type='submit'
            disabled={isSubmitting}
            className={cn('w-full', 'xs:h-12', 'xs:text-base')}
            data-testid='createListSubmit'
          >
            {isSubmitting
              ? dict.createListDialog.creating
              : dict.createListDialog.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateListDialog;