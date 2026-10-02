'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { IconUserPlus } from '@tabler/icons-react';
import { useDebounce } from '@/hooks/use-debounce';
import getDictionary from '@/app/[lang]/dictionaries';
import {
  isMemberNameRefusal,
  type MemberNameRefusal,
} from '@/lib/member-name';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AddMemberForm from '@/components/add-member-form';
import { cn } from '@/lib/utils';
import { getLocaleFromPath } from '@/lib/i18n-config';
import type {
  AddMemberDialogProps,
  AddMemberDialogDictionary,
  ToastTranslations,
  Translations,
} from '@/types';

const AddMemberDialog: React.FC<Omit<AddMemberDialogProps, 'dict'>> = ({
  onMemberAdded,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [dict, setDict] = useState<{
    addMemberDialog: AddMemberDialogDictionary;
    toasts: ToastTranslations;
    errors: Pick<Translations['errors'], 'invalidNameFormat' | 'duplicateName'>;
    close: string;
  } | null>(null);
  /*
    Which sheet an answer belongs to.

    A number that moves every time `isOpen` does, and one copy of it remembered
    per request. A ref rather than `isOpen` itself because the only reader is an
    async callback that fires 300ms and a round trip later, and a guard is only
    worth having if it cannot be a stale copy of the thing it guards.

    A *counter* rather than a mirror of `isOpen`, because `isOpen` answers the
    wrong question. A mirror can say "some sheet is up"; it cannot say "this is
    the one that asked". Submit, press Esc, reopen - and `isOpen` is true again
    by the time the answer arrives, so a mirror would act on a sheet the request
    has never seen. Moving on every up and every down separates the two.
  */
  const sheetEpochRef = useRef(0);
  const path = usePathname();
  const locale = getLocaleFromPath(path);

  useEffect(() => {
    sheetEpochRef.current += 1;
  }, [isOpen]);

  useEffect(() => {
    const loadTranslations = async () => {
      const translations = await getDictionary(locale);
      setDict({
        addMemberDialog: translations.addMemberDialog,
        toasts: translations.toasts,
        errors: {
          invalidNameFormat: translations.errors.invalidNameFormat,
          duplicateName: translations.errors.duplicateName,
        },
        close: translations.close,
      });
    };
    loadTranslations();
  }, [locale]);

  const debouncedAddMember = useDebounce(async (name: string, epoch: number) => {
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      /*
        The one decision, taken the moment the answer lands: does it belong to
        the sheet that asked for it? Both terminal branches below consult it and
        neither arrives at it independently - a response may only touch the
        surface that asked the question, never a later one and never a closed
        one. What the response does to the rest of the app is not that
        surface's business and runs whatever the answer says.

        Refusing is silent on purpose. The request did its job, the user has
        left, and on the error path the next time they type the name they get
        the sentence then. No toast: a toast is the thing round 1 moved away
        from, and firing one into a closed sheet is this same defect one layer
        up.
      */
      const belongsToOpenSheet = epoch === sheetEpochRef.current;

      /*
        A name the server will not accept is not a failed request, it is a form
        with a wrong value in it. It gets the localized sentence on the field
        itself, which persists until the name changes and is attached to the
        input for a screen reader - rather than the generic "member not added"
        toast, which is true of every failure and explains none of them. The
        route's English `message` is still in the body and still means
        something to whoever reads the network tab.

        Both of the route's 400s are the same verdict about the same field, so
        they get one table and one rendering path: there is exactly one way this
        form says "I will not accept that name", and it is the one from round 1.

        The table is keyed by the shared `MemberNameRefusal` union rather than by
        two bare strings, so a refusal added on the server without a sentence
        here is a type error rather than a missing case. The narrowing is
        `isMemberNameRefusal` - two comparisons against literals, which cannot
        reach `Object.prototype`, so it holds against a `{"code":"constructor"}`
        body without the `hasOwnProperty` call that used to guard it. A 400
        carrying any other code, or none at all, misses the table and falls
        through to the generic toast below exactly as before.
      */
      const nameFailures: Record<MemberNameRefusal, string | undefined> = {
        invalid_name_format: dict?.errors.invalidNameFormat ?? data.message,
        duplicate_name: dict?.errors.duplicateName ?? data.message,
      };
      const code = data?.code;
      const nameFailure =
        response.status === 400 && isMemberNameRefusal(code)
          ? nameFailures[code]
          : undefined;

      if (nameFailure !== undefined) {
        if (belongsToOpenSheet) {
          setNameError(nameFailure);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || dict?.toasts.memberAddFailed);
      }

      /*
        The member exists, so the two things that are true regardless of which
        sheet is up stay outside the guard: the user hears it happened, and the
        list behind the dialog is refetched. Only the dismissal is the sheet's -
        reaching for the close button on a sheet the request never submitted
        into is how a 200 used to shut the form the user had just reopened.
      */
      toast.success(dict?.toasts.memberAdded.replace('{name}', name));
      setNameError(null);
      if (belongsToOpenSheet) {
        setIsOpen(false);
      }
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error) {
      console.error(
        'Error adding member:',
        error instanceof Error ? error.message : error
      );
      toast.error(dict?.toasts.memberAddFailed);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      setNameError(null);

      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;

      /*
        The epoch is read here, at the moment the click happens, and travels with
        the request. Reading it in the callback instead would stamp the answer
        with whatever sheet is up 300ms and a round trip later - which is the
        sheet the guard is supposed to be able to reject.
      */
      debouncedAddMember(name, sheetEpochRef.current);
    },
    [debouncedAddMember]
  );

  /*
    `nameError` is state that outlives the thing that displays it: the sheet
    below unmounts on close, this component does not. So it is cleared on the way
    out rather than on the way in - otherwise an Esc close leaves the verdict
    standing, and the next open puts it back on an empty field as an
    `aria-invalid` the user never earned.

    `isLoading` is deliberately not cleared here. It can outlive a close too, but
    only until the request it is waiting on settles, and a request that succeeds
    closes the sheet that asked for it - re-enabling the button on a sheet that
    has not asked for anything would only invite a second POST for the same name.
  */
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setNameError(null);
    }
  }, []);

  if (!dict) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          data-testid='addMemberButton'
          className='justify-center text-[0.875rem]'
        >
          <IconUserPlus className={cn('h-4', 'w-4')} />
          {dict.addMemberDialog.addMember}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={dict.close}>
        <DialogHeader>
          <DialogTitle>{dict.addMemberDialog.addMemberTitle}</DialogTitle>
          <DialogDescription>
            {dict.addMemberDialog.enterMemberName}
          </DialogDescription>
        </DialogHeader>
        <AddMemberForm
          dict={dict.addMemberDialog}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          nameError={nameError}
          onNameChange={() => setNameError(null)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
