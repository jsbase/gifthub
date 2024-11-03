"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyAuth, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GiftIcon, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { AddGiftDialog } from "@/components/add-gift-dialog";

interface Member {
  id: string;
  email: string;
  joinedAt: string;
}

interface Gift {
  id: string;
  title: string;
  description?: string;
  url?: string;
  isPurchased: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = await verifyAuth();
      if (!auth) {
        router.replace("/");
        toast.error("Please log in to access the dashboard");
      } else {
        setGroupName(auth.groupName as string);
        fetchData();
      }
    };

    checkAuth();
  }, [router]);

  const fetchData = async () => {
    try {
      const [membersRes, giftsRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/gifts')
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members);
      }

      if (giftsRes.ok) {
        const giftsData = await giftsRes.json();
        setGifts(giftsData.gifts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/");
    toast.success("Logged out successfully");
  };

  const handleToggleGiftPurchased = async (giftId: string) => {
    try {
      const response = await fetch(`/api/gifts/${giftId}/toggle`, {
        method: 'PUT'
      });

      if (!response.ok) {
        throw new Error('Failed to update gift status');
      }

      fetchData(); // Refresh the gifts list
      toast.success('Gift status updated');
    } catch (error) {
      toast.error('Failed to update gift status');
    }
  };

  const handleDeleteGift = async (giftId: string) => {
    try {
      const response = await fetch(`/api/gifts/${giftId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete gift');
      }

      fetchData(); // Refresh the gifts list
      toast.success('Gift deleted successfully');
    } catch (error) {
      toast.error('Failed to delete gift');
    }
  };

  if (loading || !groupName) return null;

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
        <div className="grid gap-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Members</h2>
              <AddMemberDialog />
            </div>
            {members.length > 0 ? (
              <div className="grid gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm"
                  >
                    <div>
                      <p className="font-medium">{member.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No members added yet. Add your first member to start managing gifts.
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Gifts</h2>
              <AddGiftDialog />
            </div>
            {gifts.length > 0 ? (
              <div className="grid gap-4">
                {gifts.map((gift) => (
                  <div
                    key={gift.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{gift.title}</h3>
                        {gift.isPurchased && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            Purchased
                          </span>
                        )}
                      </div>
                      {gift.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {gift.description}
                        </p>
                      )}
                      {gift.url && (
                        <a
                          href={gift.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-1 block"
                        >
                          View Link
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleGiftPurchased(gift.id)}
                      >
                        {gift.isPurchased ? 'Mark Unpurchased' : 'Mark Purchased'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteGift(gift.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">
                No gifts added yet. Add your first gift to start tracking.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}