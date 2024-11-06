"use client";

import { GiftIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HeaderProps } from "@/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { verifyAuth } from "@/lib/auth";
import { AuthState } from "@/types";

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

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const auth = await verifyAuth();
        if (isMounted) {
          setAuthState({
            isAuthenticated: !!auth,
            groupName: auth?.groupName || initialGroupName
          });
        }
      } catch (error) {
        if (isMounted && process.env.NODE_ENV === 'development') {
          console.error('Auth check failed:', error);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [initialGroupName]);

  const homeRoute = authState.isAuthenticated ? "/dashboard" : "/";

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link 
          href={homeRoute} 
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <GiftIcon className="h-6 w-6" />
          <h1 className="text-xl font-semibold">
            {authState.groupName || "GiftHub"}
          </h1>
        </Link>

        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          {showAuth && authState.isAuthenticated && dict && onLogout && (
            <Button 
              variant="ghost" 
              onClick={onLogout}
              className="pl-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {dict.logout}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
