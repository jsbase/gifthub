import { GiftIcon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Translations } from "@/types";

interface HeaderProps {
  groupName?: string;
  dict?: Translations;
  onLogout?: () => void;
  showAuth?: boolean;
}

export function Header({ groupName, dict, onLogout, showAuth = false }: HeaderProps) {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GiftIcon className="h-6 w-6" />
          {groupName ? (
            <h1 className="text-xl font-semibold">{groupName}</h1>
          ) : (
            <h1 className="text-xl font-semibold">GiftHub</h1>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          {showAuth && dict && onLogout && (
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
