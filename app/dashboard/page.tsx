"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyAuth, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GiftIcon, LogOut, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await verifyAuth();
      if (!auth) {
        router.replace("/");
        toast.error("Please log in to access the dashboard");
      } else {
        setGroupName(auth.groupName as string);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
    toast.success("Logged out successfully");
  };

  if (!groupName) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GiftIcon className="h-6 w-6" />
            <h1 className="text-xl font-semibold">{groupName}</h1>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Members</h2>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>
            <div className="text-muted-foreground">
              No members added yet. Add your first member to start managing gifts.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}