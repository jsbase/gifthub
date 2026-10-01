'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import getDictionary from '@/app/[lang]/dictionaries';
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
    errors: Pick<Translations['errors'], 'invalidNameFormat'>;
    close: string;
  } | null>(null);
  /*
    Whether the sheet is up, as of the last commit. A ref rather than `isOpen`
    itself because the only reader is an async callback that fires 300ms and a
    round trip later, and a guard is only worth having if it cannot be a stale
    copy of the thing it guards.
  */
  const isOpenRef = useRef(isOpen);
  const path = usePathname();
  const locale = getLocaleFromPath(path);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const loadTranslations = async () => {
      const translations = await getDictionary(locale);
      setDict({
        addMemberDialog: translations.addMemberDialog,
        toasts: translations.toasts,
        errors: { invalidNameFormat: translations.errors.invalidNameFormat },
        close: translations.close,
      });
    };
    loadTranslations();
  }, [locale]);

  const debouncedAddMember = useDebounce(async (name: string) => {
    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      /*
        A name the server will not accept is not a failed request, it is a form
        with a wrong value in it. It gets the localized sentence on the field
        itself, which persists until the name changes and is attached to the
        input for a screen reader - rather than the generic "member not added"
        toast, which is true of every failure and explains none of them. The
        route's English `message` is still in the body and still means
        something to whoever reads the network tab.

        Only while the sheet is up. Esc inside the debounce or the round trip is
        all it takes for this 400 to come back to a closed dialog, and an error
        written into a surface nobody is looking at is the next open's problem.
        Refused silently: the request did its job, the user has left, and the
        next time they type the name they get the sentence then.
      */
      if (response.status === 400 && data?.code === 'invalid_name_format') {
        if (isOpenRef.current) {
          setNameError(dict?.errors.invalidNameFormat ?? data.message);
        }
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || dict?.toasts.memberAddFailed);
      }

      toast.success(dict?.toasts.memberAdded.replace('{name}', name));
      setNameError(null);
      setIsOpen(false);
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

      debouncedAddMember(name);
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
    closes whatever sheet is open when it lands - re-enabling the button on a
    reopened sheet would only invite a second POST for the same name.
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
          <UserPlus className={cn('h-4', 'w-4')} />
          {dict.addMemberDialog.addMember}
        </Button>
      </DialogTrigger>
      <DialogContent
        closeLabel={dict.close}
        className={cn(
          'xs:h-auto',
          'xs:max-h-[calc(100dvh-var(--header-height)-1rem)]'
        )}
      >
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
