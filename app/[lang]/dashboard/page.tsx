'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { AddMemberDialog } from '@/components/add-member-dialog';
import { MemberGiftsDialog } from '@/components/member-gifts-dialog';
import { Footer } from '@/components/footer';
import { ChevronRight } from 'lucide-react';
import { verifyAuth, logout } from '@/lib/auth';
import { getDictionary } from '../dictionaries';
import { Member, Gift, Translations } from '@/types';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/loading-spinner';
import { cn } from '@/lib/utils';

export default function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = use(params);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [dict, setDict] = useState<Translations | null>(null);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberGiftCounts, setMemberGiftCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberGifts, setMemberGifts] = useState<Gift[]>([]);
  const [isRouteChanging, setIsRouteChanging] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchGiftCounts = useCallback(async (members: Member[]) => {
    const giftCounts: Record<string, number> = {};
    for (const member of members) {
      const giftsRes = await fetch(`/api/gifts?memberId=${member.id}`);
      if (giftsRes.ok) {
        const giftsData = await giftsRes.json();
        giftCounts[member.id] = giftsData.gifts.length;
      }
    }
    setMemberGiftCounts(giftCounts);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const membersRes = await fetch('/api/members');
      if (!membersRes.ok) throw new Error('Failed to fetch members');

      const membersData = await membersRes.json();
      setMembers(membersData.members);
      await fetchGiftCounts(membersData.members);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(dict?.errors.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [dict, fetchGiftCounts]);

  useEffect(() => {
    const init = async () => {
      const translations = await getDictionary(lang) as Translations;
      setDict(translations);

      const auth = await verifyAuth();
      if (!auth) {
        router.replace(`/${lang}`);
        toast.error(translations.errors.loginRequired);
        return;
      }

      setGroupName(auth.groupName ?? '');
      fetchData();
    };

    init();
  }, [router, lang, fetchData, dict]);

  const pathname = usePathname();

  useEffect(() => {
    setIsRouteChanging(false);
  }, [pathname]);

  const handleMemberClick = async (memberId: string) => {
    try {
      const response = await fetch(`/api/gifts?memberId=${memberId}`);
      if (!response.ok) throw new Error('Failed to fetch member gifts');

      const data = await response.json();
      setSelectedMemberId(memberId);
      setMemberGifts(data.gifts);
    } catch (error) {
      toast.error(dict?.errors.failedToLoadGifts);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace(`/${lang}`);
    toast.success(dict?.success.loggedOut);
  };

  const getSelectedMember = () => members.find(m => m.id === selectedMemberId);

  const updateMemberGiftCount = useCallback(async (memberId: string) => {
    const response = await fetch(`/api/gifts?memberId=${memberId}`);
    if (response.ok) {
      const data = await response.json();
      setMemberGiftCounts(prev => ({
        ...prev,
        [memberId]: data.gifts.length
      }));
    }
  }, []);

  if (loading || !groupName || !dict || isRouteChanging) {
    return <LoadingSpinner />;
  }

  if (!mounted) return null;

  return (
    <div className={cn(
      "min-h-screen",
      "bg-background",
      "flex flex-col"
    )}>
      <Header
        groupName={groupName}
        dict={dict}
        onLogout={handleLogout}
        showAuth={true}
      />

      <main className={cn(
        "container",
        "mx-auto",
        "px-4 py-8",
        "flex-1"
      )}>
        <section>
          <div className={cn(
            "flex",
            "items-center",
            "justify-between",
            "mb-6"
          )}>
            <h2 className={cn(
              "text-2xl",
              "font-bold"
            )}>
              {dict.members}
            </h2>
            <AddMemberDialog onMemberAdded={fetchData} />
          </div>

          {members.length > 0 ? (
            <div className="grid gap-4">
              {members.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  className={cn(
                    "w-full",
                    "pr-0 pl-2",
                    "h-auto",
                    "bg-card",
                    "hover:bg-accent",
                    "flex",
                    "items-center",
                    "justify-between"
                  )}
                  onClick={() => handleMemberClick(member.id)}
                >
                  <div className={cn(
                    "flex flex-col",
                    "items-start"
                  )}>
                    <p className="font-medium">
                      {member.name}
                    </p>
                    <p className={cn(
                      "text-sm",
                      "text-muted-foreground"
                    )}>
                      {memberGiftCounts[member.id] === 0 
                        ? dict.giftCount.zero 
                        : memberGiftCounts[member.id] === 1 
                          ? dict.giftCount.one
                          : dict.giftCount.many.replace('{{count}}', String(memberGiftCounts[member.id] || 0))}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "h-5 w-5",
                    "text-muted-foreground"
                  )} />
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
        memberName={getSelectedMember()?.name ?? ''}
        memberId={selectedMemberId ?? ''}
        gifts={memberGifts}
        onGiftAdded={() => {
          if (selectedMemberId) {
            handleMemberClick(selectedMemberId);
            updateMemberGiftCount(selectedMemberId);
          }
        }}
        dict={{
          ...dict.memberGifts,
          toasts: dict.toasts,
          confirmations: dict.confirmations
        }}
      />

      <Footer dict={dict} />
    </div>
  );
}
