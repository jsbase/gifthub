'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconLogout, IconUsers } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';
import LanguageSwitcher from '@/components/language-switcher';
import GroupsDialog from '@/components/groups-dialog';
import { verifyAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { AuthState, HeaderProps } from '@/types';

const Header: React.FC<HeaderProps> = ({
  displayName,
  dict,
  onLogout,
  showAuth = false,
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    displayName,
  });

  /*
    Whether the group manager is open. It lives here rather than on the contents page
    because a group is *account*-scoped: it has to be reachable from every screen an
    account owns a list from, and the contents page is the only one of them that
    always exists. `PRODUCT.md` describes exactly one contents page and a tight
    chrome, so this is one more control in the bar rather than a card or a section
    somewhere - and it sits next to the display name because both are things the
    account *has* rather than things it can do to a list.
  */
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);

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
            /*
              `auth.displayName` first, and the prop only as what to show until
              the answer lands. The prop is what a server-rendered page was told;
              the answer is what the session cookie actually says, and after a
              sign-in or a sign-out on this tab the cookie is the newer truth.

              It is also the only line of the identity that ever reaches the DOM.
              `verifyAuth` also returns the address, which is a lookup key rather
              than something a person is called, and `PRODUCT.md:72` asks for the
              name.
            */
            displayName: auth?.displayName || displayName,
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
  }, [displayName, pathname]);

  const isDashboardRoute = pathname.includes('/dashboard');

  const homeRoute = `/${currentLang}${
    isDashboardRoute && !authState.isAuthenticated
      ? ''
      : authState.isAuthenticated
      ? '/dashboard'
      : ''
  }`;

  const currentDisplayName = authState.isAuthenticated
    ? authState.displayName
    : undefined;

  return (
    <header className='border-b border-rule'>
      {/*
        The running head of a page: the name on the left, the instruments on the
        right, one hairline underneath. `mr-auto` rather than `justify-between`
so the name takes the slack and the controls can never be pushed off the
          row by a long name - the name is the one thing here allowed to shrink, and
          it is the only one with an ellipsis.

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
          aria-label={currentDisplayName || 'wishy'}
          title={currentDisplayName || undefined}
        >
          <Logo
            size='sm'
            displayName={currentDisplayName}
            className='min-w-0'
          />
        </Link>

        <div className={cn('flex', 'shrink-0', 'items-center', 'gap-2')}>
          <LanguageSwitcher label={dict?.changeLanguage} />
          {showAuth && authState.isAuthenticated && dict && (
            /*
              Groups, before the logout control and shaped like it: a bare glyph at
              narrow widths, its word back at 640px. Same treatment and the same two
              reasons - there is no room for a second label on a phone, and these are
              both secondary controls for a thing that is not the current screen.

              The word is `groups.title` rather than a header-specific string, and it
              is not `groups.openGroups`: the visible label is the thing the control
              *is*, and `aria-label` below carries the same word, so the accessible
              name still contains the visible text as WCAG 2.5.3 asks.
            */
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsGroupsOpen(true)}
              data-testid='openGroups'
              aria-label={dict.groups.openGroups}
              className={cn('sm:w-auto', 'sm:px-3')}
            >
              <IconUsers className={cn('h-5', 'w-5', 'shrink-0')} />
              <span className={cn('hidden', 'text-[0.8125rem]', 'sm:inline')}>
                {dict.groups.title}
              </span>
            </Button>
          )}
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

      {/*
        Mounted only while it is open, like every other dialog in this product: both
        callers unmount rather than hide, so a closed sheet holds no state and re-reads
        the account's groups when it is next opened rather than showing what was true
        the last time somebody looked.

        Gated on the same condition as the control that opens it, so there is no path
        to a group manager for a person with no session - the dialog could only
        answer 401, and `PRODUCT.md:65` says a control that cannot work is absent.
      */}
      {showAuth && authState.isAuthenticated && dict && (
        <GroupsDialog
          isOpen={isGroupsOpen}
          onClose={() => setIsGroupsOpen(false)}
          dict={dict}
          onChanged={() => {}}
        />
      )}
    </header>
  );
};

export default Header;
