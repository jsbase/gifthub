'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconLogout } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import LanguageSwitcher from '@/components/language-switcher';
import { verifyAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { AuthState, HeaderProps } from '@/types';

const Header: React.FC<HeaderProps> = ({
  groupName,
  dict,
  onLogout,
  showAuth = false,
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    groupName,
  });

  const pathname = usePathname();
  const currentLang = pathname.split('/')[1];

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const auth = await verifyAuth(true);
        if (isMounted) {
          setAuthState({
            isAuthenticated: auth?.success ?? false,
            groupName: auth?.groupName || groupName,
          });
        }
      } catch (error) {
        if (isMounted) {
          setAuthState((prev) => ({
            ...prev,
            isAuthenticated: false,
          }));
          if (process.env.NODE_ENV === 'development') {
            console.error('Auth check failed:', error);
          }
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [groupName, pathname]);

  const isDashboardRoute = pathname.includes('/dashboard');

  const homeRoute = `/${currentLang}${
    isDashboardRoute && !authState.isAuthenticated
      ? ''
      : authState.isAuthenticated
      ? '/dashboard'
      : ''
  }`;

  const currentGroupName = authState.isAuthenticated
    ? authState.groupName
    : undefined;

  return (
    <header className='border-b border-rule'>
      <div
        className={cn(
          'container',
          'mx-auto',
          'h-header',
          'flex',
          'items-center',
          'justify-between',
          'gap-4'
        )}
      >
        <Link
          href={homeRoute}
          className={cn('rounded-sm', '-ml-1', 'px-1', 'py-1')}
          data-testid='logo'
          aria-label={currentGroupName || 'wishy'}
        >
          <Logo size='sm' groupName={currentGroupName} />
        </Link>

        <div className={cn('flex', 'items-center', 'gap-1', 'sm:gap-3')}>
          <LanguageSwitcher />
          {showAuth && authState.isAuthenticated && dict && onLogout && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onLogout}
              data-testid='logout'
              className='px-2'
            >
              <IconLogout className={cn('h-4', 'w-4')} />
              {dict.logout}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
