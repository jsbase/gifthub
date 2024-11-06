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
    if (showAuth) {
      const checkAuth = async () => {
        try {
          const auth = await verifyAuth();
          if (auth) {
            setAuthState({
              isAuthenticated: true,
              groupName: auth.groupName
            });
          }
        } catch (error) {
          if (error instanceof Error && !error.message.includes('401')) {
            console.error('Auth verification failed:', error);
          }
        }
      };

      checkAuth();
    }
  }, [showAuth]);

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
          {authState.isAuthenticated && dict && onLogout && (
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
