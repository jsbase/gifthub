'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AuthDialog from '@/components/auth-dialog';
import LoginForm from '@/components/login-form';
import RegisterForm from '@/components/register-form';
import { login, register } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import type { AuthButtonsProps } from '@/types';

const AuthButtons: React.FC<AuthButtonsProps> = ({ dict }) => {
  const router = useRouter();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginBase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const groupName = formData.get('groupName') as string;
    const password = formData.get('password') as string;

    try {
      await login(groupName, password);
      toast.success(dict?.toasts.loginSuccess);
      setIsLoginOpen(false);
      router.refresh();

      const lang =
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('NEXT_LOCALE='))
          ?.split('=')[1] || 'en';

      router.push(`/${lang}/dashboard`);
    } catch (error) {
      toast.error(dict?.errors.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
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
  };

  const handleLogin = useDebounce(handleLoginBase, 500, { leading: true });
  const handleRegister = useDebounce(handleRegisterBase, 500, {
    leading: true,
  });

  return (
    <div className={cn('flex', 'flex-col sm:flex-row', 'gap-4 justify-center')}>
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogTrigger asChild>
          <Button
            size='lg'
            className='min-w-[200px]'
            aria-label='OpenLogin'
            data-testid='OpenLogin'
          >
            {dict.login}
          </Button>
        </DialogTrigger>
        <AuthDialog
          title={dict.loginToGroup}
          description={dict.enterGroupName}
          className={cn('xs:h-[85vh]', 'xs:max-h-[85vh]')}
        >
          <LoginForm dict={dict} isLoading={isLoading} onSubmit={handleLogin} />
        </AuthDialog>
      </Dialog>

      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogTrigger asChild>
          <Button
            size='lg'
            variant='outline'
            className='min-w-[200px]'
            aria-label='OpenRegister'
            data-testid='OpenRegister'
          >
            {dict.register}
          </Button>
        </DialogTrigger>
        <AuthDialog
          title={dict.createGroup}
          description={dict.createGroupDescription}
          className={cn('xs:h-[85vh]', 'xs:max-h-[85vh]')}
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
};

export default AuthButtons;
