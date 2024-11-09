"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AddMemberDialogProps } from "@/types";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { usePathname } from "next/navigation";
import { AddMemberDialogDictionary, ToastTranslations } from "@/types";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

// Memoize the form component since it's reused and only depends on specific props
const AddMemberForm = memo(function AddMemberForm({
  dict,
  isLoading,
  onSubmit
}: {
  dict: AddMemberDialogDictionary;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="name">
          {dict.enterMemberName}
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder={dict.enterMemberName}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? dict.adding : dict.addMember}
      </Button>
    </form>
  );
});

export default function AddMemberDialog({ onMemberAdded }: Omit<AddMemberDialogProps, 'dict'>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dict, setDict] = useState<{
    addMemberDialog: AddMemberDialogDictionary;
    toasts: ToastTranslations;
  } | null>(null);
  const pathname = usePathname();
  const lang = pathname.split('/')[1];

  useEffect(() => {
    const loadTranslations = async () => {
      const translations = await getDictionary(lang);
      setDict({
        addMemberDialog: translations.addMemberDialog,
        toasts: translations.toasts
      });
    };
    loadTranslations();
  }, [lang]);

  // Debounce the member addition
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
      console.error('Error adding member:', error instanceof Error ? error.message : error);
      toast.error(dict?.toasts.memberAddFailed);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    debouncedAddMember(name);
  }, [debouncedAddMember]);

  if (!dict) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className={cn("h-4 w-4", "mr-2")} />
          {dict.addMemberDialog.addMember}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn("xs:p-4", "xs:h-[85vh]", "xs:max-h-[85vh]")}>
        <DialogHeader>
          <DialogTitle>{dict.addMemberDialog.addMemberTitle}</DialogTitle>
          <DialogDescription className="sr-only">
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
}
