"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AddMemberDialogProps } from "@/types";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { usePathname } from "next/navigation";
import { AddMemberDialogDictionary } from "@/types";
import { cn } from "@/lib/utils";

export function AddMemberDialog({ onMemberAdded }: Omit<AddMemberDialogProps, 'dict'>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dict, setDict] = useState<AddMemberDialogDictionary | null>(null);
  const pathname = usePathname();
  
  // Get current language from URL
  const lang = pathname.split('/')[1];

  // Load translations when component mounts
  useEffect(() => {
    const loadTranslations = async () => {
      const translations = await getDictionary(lang);
      if (translations.addMemberDialog) {
        setDict(translations.addMemberDialog as unknown as AddMemberDialogDictionary);
      }
    };
    loadTranslations();
  }, [lang]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

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
        throw new Error(data.message || 'Failed to add member');
      }

      toast.success(`Member ${name} added successfully`);
      setIsOpen(false);
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setIsLoading(false);
    }
  };

  if (!dict) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {dict.addMember}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "xs:p-4",
        "xs:h-[85vh] xs:max-h-[85vh]"
      )}>
        <DialogHeader>
          <DialogTitle>{dict.addMemberTitle}</DialogTitle>
          <DialogDescription>
            {dict.enterMemberName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{dict.enterMemberName}</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={dict.enterMemberName}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Adding...' : dict.addMember}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
