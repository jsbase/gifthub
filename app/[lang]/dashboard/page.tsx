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
import { use } from 'react';
import { Header } from "@/components/header";

export default function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = use(params);
  const router = useRouter();
  const [dict, setDict] = useState<Translations | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberGifts, setMemberGifts] = useState<Gift[]>([]);

  useEffect(() => {
    const init = async () => {
      const translations = (await getDictionary(lang)) as Translations;
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
      <Header 
        groupName={groupName} 
        dict={dict} 
        onLogout={handleLogout}
        showAuth={true}
      />

      <main className="container mx-auto px-4 py-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{dict.members}</h2>
            <AddMemberDialog onMemberAdded={fetchData} />
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
        dict={{
          ...dict.memberGifts,
          toasts: dict.toasts,
          confirmations: dict.confirmations
        }}
      />
    </div>
  );
}
