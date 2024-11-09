"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { login, register } from "@/lib/auth";
import { Translations } from "@/types";
import { cn } from "@/lib/utils";

// Memoize the login form
const LoginForm = memo(function LoginForm({
  dict,
  isLoading,
  onSubmit
}: {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className={cn(
      "space-y-dialog-desktop",
      "xs:space-y-dialog-mobile"
    )}>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="groupName">{dict.groupName}</Label>
        <Input 
          name="groupName" 
          id="groupName" 
          placeholder={dict.groupName} 
          required 
        />
      </div>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="password">{dict.enterPassword}</Label>
        <Input 
          name="password" 
          id="password" 
          type="password" 
          placeholder={dict.enterPassword} 
          required 
        />
      </div>
      <Button 
        type="submit" 
        className={cn("w-full", "xs:text-base", "xs:h-12")}
        disabled={isLoading}
      >
        {isLoading ? dict.loading : dict.login}
      </Button>
    </form>
  );
});

// Memoize the register form
const RegisterForm = memo(function RegisterForm({
  dict,
  isLoading,
  onSubmit
}: {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className={cn(
      "space-y-dialog-desktop",
      "xs:space-y-dialog-mobile"
    )}>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="newGroupName">{dict.groupName}</Label>
        <Input 
          name="newGroupName" 
          id="newGroupName" 
          placeholder={dict.groupName} 
          required 
        />
      </div>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="newPassword">{dict.enterPassword}</Label>
        <Input 
          name="newPassword" 
          id="newPassword" 
          type="password" 
          placeholder={dict.enterPassword} 
          required 
        />
      </div>
      <div className="space-y-2">
        <Label className="sr-only" htmlFor="confirmPassword">{dict.confirmPassword}</Label>
        <Input 
          name="confirmPassword" 
          id="confirmPassword" 
          type="password" 
          placeholder={dict.confirmPassword} 
          required 
        />
      </div>
      <Button 
        type="submit" 
        className={cn("w-full", "xs:text-base", "xs:h-12")}
        disabled={isLoading}
      >
        {isLoading ? dict.loading : dict.createGroupBtn}
      </Button>
    </form>
  );
});

export function AuthButtons({ dict }: { dict: Translations }) {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const groupName = formData.get('groupName') as string;
    const password = formData.get('password') as string;

    try {
      await login(groupName, password);
      toast.success(dict?.toasts.loginSuccess);
      setIsLoginOpen(false);
      router.refresh();
      
      // Get current language from cookie
      const lang = document.cookie.split('; ')
        .find(row => row.startsWith('NEXT_LOCALE='))
        ?.split('=')[1] || 'en';
        
      router.push(`/${lang}/dashboard`);
    } catch (error) {
      toast.error(dict?.errors.loginFailed);
    } finally {
      setIsLoading(false);
    }
  }, [dict?.toasts.loginSuccess, dict?.errors.loginFailed, router]);

  const handleRegister = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const groupName = formData.get('newGroupName') as string;
    const password = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast.error(dict?.errors.passwordMismatch);
      setIsLoading(false);
      return;
    }

    try {
      await register(groupName, password);
      toast.success(dict?.toasts.registrationSuccess);
      setIsRegisterOpen(false);
      setIsLoginOpen(true);
    } catch (error) {
      toast.error(dict?.errors.registrationFailed);
    } finally {
      setIsLoading(false);
    }
  }, [dict?.errors.passwordMismatch, dict?.toasts.registrationSuccess, dict?.errors.registrationFailed]);

  return (
    <div className={cn(
      "flex",
      "flex-col sm:flex-row",
      "gap-4 justify-center"
    )}>
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="min-w-[200px]">
            {dict.login}
          </Button>
        </DialogTrigger>
        <AuthDialog 
          title={dict.loginToGroup} 
          description={dict.enterGroupName}
          className={cn(
            "xs:h-[85vh]",
            "xs:max-h-[85vh]"
          )}
        >
          <LoginForm 
            dict={dict}
            isLoading={isLoading}
            onSubmit={handleLogin}
          />
        </AuthDialog>
      </Dialog>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogTrigger asChild>
          <Button size="lg" variant="outline" className="min-w-[200px]">
            {dict.register}
          </Button>
        </DialogTrigger>
        <AuthDialog 
          title={dict.createGroup} 
          description={dict.createGroupDescription}
          className={cn(
            "xs:h-[85vh]",
            "xs:max-h-[85vh]"
          )}
        >
          <RegisterForm 
            dict={dict}
            isLoading={isLoading}
            onSubmit={handleRegister}
          />
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
