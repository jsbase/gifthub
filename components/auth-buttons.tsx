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
      router.push('/dashboard');
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
        <AuthDialog title={dict.loginToGroup} description={dict.enterGroupName}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">{dict.groupName}</Label>
              <Input name="groupName" id="groupName" placeholder={dict.enterGroupName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{dict.password}</Label>
              <Input name="password" id="password" type="password" placeholder={dict.enterPassword} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : dict.login}
            </Button>
          </form>
        </AuthDialog>
      </Dialog>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogTrigger asChild>
          <Button size="lg" variant="outline" className="min-w-[200px]">{dict.register}</Button>
        </DialogTrigger>
        <AuthDialog title={dict.createGroup} description={dict.enterGroupName}>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newGroupName">{dict.groupName}</Label>
              <Input name="newGroupName" id="newGroupName" placeholder={dict.enterGroupName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{dict.password}</Label>
              <Input name="newPassword" id="newPassword" type="password" placeholder={dict.enterPassword} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{dict.confirmPassword}</Label>
              <Input name="confirmPassword" id="confirmPassword" type="password" placeholder={dict.confirmPassword} required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Group...' : dict.createGroupBtn}
            </Button>
          </form>
        </AuthDialog>
      </Dialog>
    </div>
  );
}

export function AuthDialog({ children, title, description }: {
  children: React.ReactNode,
  title: string,
  description: string
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {children}
    </DialogContent>
  )
}
