"use client";

import React from 'react';
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HeaderProps } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { verifyAuth } from "@/lib/auth";
import { AuthState } from "@/types";
import { usePathname } from "next/navigation";
import { cn } from '@/lib/utils';
import { Logo } from "@/components/logo";

export function Header({
  groupName: initialGroupName,
  dict,
  onLogout,
  showAuth = false
}: HeaderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    groupName: initialGroupName
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
            groupName: auth?.groupName || initialGroupName
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
  }, [initialGroupName, pathname]);

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
}
