'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { verifyAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/language-switcher";
import { usePathname } from "next/navigation";
import { cn } from '@/lib/utils';
import { AuthState, HeaderProps } from "@/types";

const Header: ({ groupName, dict, onLogout, showAuth }: HeaderProps) => JSX.Element | null = ({
  groupName,
  dict,
  onLogout,
  showAuth = false
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    groupName
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
            groupName: auth?.groupName || groupName
          });
        }
      } catch (error) {
        if (isMounted) {
          setAuthState(prev => ({
            ...prev,
            isAuthenticated: false
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

  const homeRoute = `/${currentLang}${isDashboardRoute && !authState.isAuthenticated ? '' : authState.isAuthenticated ? '/dashboard' : ''}`;

  return (
    <header className="border-b">
      <div className={cn(
        "container",
        "mx-auto",
        "px-4",
        "py-4",
        "flex",
        "items-center",
        "justify-between"
      )}>
        <Link
          href={homeRoute}
          className={cn(
            "hover:opacity-80",
            "transition-opacity"
          )}
        >
          <Logo
            size="sm"
            groupName={authState.isAuthenticated ? authState.groupName : undefined}
          />
        </Link>

        <div className={cn(
          "flex",
          "items-center",
          "space-x-4"
        )}>
          <LanguageSwitcher />
          {showAuth && authState.isAuthenticated && dict && onLogout && (
            <Button
              variant="ghost"
              onClick={onLogout}
              className="pl-2"
            >
              <LogOut className={cn(
                "h-4",
                "w-4",
                "mr-2"
              )} />
              {dict.logout}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;