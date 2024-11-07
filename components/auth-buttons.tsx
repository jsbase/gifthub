"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { login, register } from "@/lib/auth";
import { Translations } from "@/types";
import { cn } from "@/lib/utils";

export function AuthButtons({ dict }: { dict: Translations }) {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const groupName = formData.get('groupName') as string;
    const password = formData.get('password') as string;

    try {
      await login(groupName, password);
      toast.success('Logged in successfully');
      setIsLoginOpen(false);
      router.refresh();
      
      // Get current language from cookie
      const lang = document.cookie.split('; ')
        .find(row => row.startsWith('NEXT_LOCALE='))
        ?.split('=')[1] || 'en';
        
      router.push(`/${lang}/dashboard`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const groupName = formData.get('newGroupName') as string;
    const password = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await register(groupName, password);
      toast.success('Registration successful! Please log in.');
      setIsRegisterOpen(false);
      setIsLoginOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="min-w-[200px]">{dict.login}</Button>
        </DialogTrigger>
        <AuthDialog 
          title={dict.loginToGroup} 
          description={dict.enterGroupName}
          className="xs:h-[85vh] xs:max-h-[85vh]"
        >
          <form onSubmit={handleLogin} className="space-y-dialog-desktop xs:space-y-dialog-mobile">
            <div className="space-y-2">
              <Label htmlFor="groupName"></Label>
              <Input 
                name="groupName" 
                id="groupName" 
                placeholder={dict.groupName} 
                required 
                className="xs:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password"></Label>
              <Input 
                name="password" 
                id="password" 
                type="password" 
                placeholder={dict.enterPassword} 
                required 
                className="xs:text-base"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full xs:text-base xs:h-12" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : dict.login}
            </Button>
          </form>
        </AuthDialog>
      </Dialog>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogTrigger asChild>
          <Button size="lg" variant="outline" className="min-w-[200px]">{dict.register}</Button>
        </DialogTrigger>
        <AuthDialog 
          title={dict.createGroup} 
          description={dict.createGroupDescription}
          className="xs:h-[85vh] xs:max-h-[85vh]"
        >
          <form onSubmit={handleRegister} className="space-y-dialog-desktop xs:space-y-dialog-mobile">
            <div className="space-y-2">
              <Label htmlFor="newGroupName"></Label>
              <Input 
                name="newGroupName" 
                id="newGroupName" 
                placeholder={dict.groupName} 
                required 
                className="xs:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword"></Label>
              <Input 
                name="newPassword" 
                id="newPassword" 
                type="password" 
                placeholder={dict.enterPassword} 
                required 
                className="xs:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword"></Label>
              <Input 
                name="confirmPassword" 
                id="confirmPassword" 
                type="password" 
                placeholder={dict.confirmPassword} 
                required 
                className="xs:text-base"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full xs:text-base xs:h-12" 
              disabled={isLoading}
            >
              {isLoading ? 'Creating Group...' : dict.createGroupBtn}
            </Button>
          </form>
        </AuthDialog>
      </Dialog>
    </div>
  );
}

export function AuthDialog({ 
  children, 
  title, 
  description,
  className 
}: {
  children: React.ReactNode,
  title: string,
  description: string,
  className?: string
}) {
  return (
    <DialogContent className={cn(
      "max-w-dialog",
      "xs:p-dialog-mobile p-dialog-desktop",
      className
    )}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  );
}
