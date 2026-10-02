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
      {/*
        The running head of a page: the name on the left, the instruments on the
        right, one hairline underneath. `mr-auto` rather than `justify-between`
        so the name takes the slack and the controls can never be pushed off the
        row by a long group name - the name is the one thing here allowed to
        shrink, and it is the only one with an ellipsis.

        `--header-height` is deliberately left at 56px. A 44px control inside it
        already clears by 6px top and bottom, which is on the unit, so the header
        was never short vertically; it was short horizontally, and a taller bar
        would have taken 8px off the dialog and the contents sheet to buy nothing
        a 12px gap does not already buy.
      */}
      <div
        className={cn(
          'container',
          'mx-auto',
          'h-header',
          'flex',
          'items-center',
          'gap-3'
        )}
      >
        <Link
          href={homeRoute}
          className={cn(
            'flex',
            'min-h-11',
            'min-w-0',
            'mr-auto',
            'items-center',
            '-ml-1.5',
            'rounded-sm',
            'px-1.5'
          )}
          data-testid='logo'
          aria-label={currentGroupName || 'wishy'}
          title={currentGroupName || undefined}
        >
          <Logo size='sm' groupName={currentGroupName} className='min-w-0' />
        </Link>

        <div className={cn('flex', 'shrink-0', 'items-center', 'gap-2')}>
          <LanguageSwitcher label={dict?.changeLanguage} />
          {showAuth && authState.isAuthenticated && dict && onLogout && (
            /*
              Secondary, so it is a bare glyph with no edge: at most widths
              there is nothing to log out *from* except this, and it is the
              control you press when you are finished, not while you work. The
              word comes back at 640px, where there is room for it and where a
              labelled button is the more honest target.

              `aria-label` and `title` carry the word at the widths where the
              glyph is alone, so the control is never an unlabelled icon - and
              the accessible name still contains the visible text when the text
              is visible, which is what WCAG 2.5.3 asks for.
            */
            <Button
              variant='ghost'
              size='icon'
              onClick={onLogout}
              data-testid='logout'
              aria-label={dict.logout}
              className={cn('sm:w-auto', 'sm:px-3')}
            >
              <IconLogout className={cn('h-5', 'w-5', 'shrink-0')} />
              {/*
                0.8125rem is the documented `meta` step, not `sm`'s 0.875rem: a
                secondary action should recede further than a primary label, and
                it puts the header on a clean 20 / 13 / 11 descending scale against
                the name and the switcher's code.
              */}
              <span className={cn('hidden', 'text-[0.8125rem]', 'sm:inline')}>
                {dict.logout}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
