"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyAuth, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { GiftIcon, LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { MemberGiftsDialog } from "@/components/member-gifts-dialog";
import { Member, Gift, Translations } from "@/types";
import { getDictionary } from '../dictionaries';

export default function DashboardPage({
  params: { lang }
}: {
  params: { lang: string }
}) {
  const router = useRouter();
  const [dict, setDict] = useState<Translations | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberGifts, setMemberGifts] = useState<Gift[]>([]);

  useEffect(() => {
    const init = async () => {
      const translations = await getDictionary(lang);
      setDict(translations);
      
      const auth = await verifyAuth();
      if (!auth) {
        router.replace(`/${lang}`);
        toast.error(translations.errors.loginRequired);
      } else {
        setGroupName(auth.groupName as string);
        fetchData();
      }
    };

    init();
  }, [router, lang]);

  const fetchData = async () => {
    try {
      const membersRes = await fetch('/api/members');
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(dict?.errors.failedToLoad || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace(`/${lang}`);
    toast.success(dict?.success.loggedOut || 'Logged out successfully');
  };

  const handleMemberClick = async (memberId: string) => {
    try {
      const response = await fetch(`/api/gifts?memberId=${memberId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch member gifts');
      }
      
      const data = await response.json();
      setSelectedMemberId(memberId);
      setMemberGifts(data.gifts);
    } catch (error) {
      toast.error(dict?.errors.failedToLoadGifts || 'Failed to load gifts');
    }
  };

  const getSelectedMember = () => members.find(m => m.id === selectedMemberId);

  if (loading || !groupName || !dict) return null;

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
            {dict.logout}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{dict.members}</h2>
            <AddMemberDialog onMemberAdded={fetchData} dict={dict.addMember} />
          </div>
          {members?.length > 0 ? (
            <div className="grid gap-4">
              {members.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  className="w-full p-4 h-auto bg-card hover:bg-accent flex items-center justify-between"
                  onClick={() => handleMemberClick(member.id)}
                >
                  <div className="flex flex-col items-start">
                    <p className="font-medium">{member.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {dict.joined} {new Date(member.joinedAt).toLocaleDateString(lang)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">
              {dict.noMembers}
            </div>
          )}
        </section>
      </main>

      <MemberGiftsDialog
        isOpen={!!selectedMemberId}
        onClose={() => setSelectedMemberId(null)}
        memberEmail={getSelectedMember()?.email || ''}
        memberId={selectedMemberId || ''}
        gifts={memberGifts}
        onGiftAdded={() => handleMemberClick(selectedMemberId!)}
        dict={dict.memberGifts}
      />
    </div>
  );
}