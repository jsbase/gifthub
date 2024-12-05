'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
} from '@/types';

const AddMemberDialog: React.FC<Omit<AddMemberDialogProps, 'dict'>> = ({
  onMemberAdded,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dict, setDict] = useState<{
    addMemberDialog: AddMemberDialogDictionary;
    toasts: ToastTranslations;
  } | null>(null);
  const path = usePathname();
  const locale = getLocaleFromPath(path);

  useEffect(() => {
    const loadTranslations = async () => {
      const translations = await getDictionary(locale);
      setDict({
        addMemberDialog: translations.addMemberDialog,
        toasts: translations.toasts,
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

      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || dict?.toasts.memberAddFailed);
      }

      toast.success(dict?.toasts.memberAdded.replace('{name}', name));
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

      const formData = new FormData(e.currentTarget);
      const name = formData.get('name') as string;

      debouncedAddMember(name);
    },
    [debouncedAddMember]
  );

  if (!dict) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid='addMemberButton'>
          <UserPlus className={cn('h-4 w-4', 'mr-2')} />
          {dict.addMemberDialog.addMember}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn('xs:p-4', 'xs:h-[85vh]', 'xs:max-h-[85vh]')}>
        <DialogHeader>
          <DialogTitle>{dict.addMemberDialog.addMemberTitle}</DialogTitle>
          <DialogDescription className='sr-only'>
            {dict.addMemberDialog.enterMemberName}
          </DialogDescription>
        </DialogHeader>
        <AddMemberForm
          dict={dict.addMemberDialog}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
