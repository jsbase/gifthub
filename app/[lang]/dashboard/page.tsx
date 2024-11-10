'use client';

import { useEffect, useState, use, useCallback, memo, lazy } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { verifyAuth, logout } from '@/lib/auth';
import { getDictionary } from '../dictionaries';
import { Member, Gift, Translations } from '@/types';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/loading-spinner';
import { cn } from '@/lib/utils';
import { MemberList } from '@/components/member-list';

const MemberGiftsDialog = lazy(() => import('@/components/member-gifts-dialog'));

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

  // Optimize fetchData to only depend on essential dependencies
  const fetchData = useCallback(async () => {
    try {
      // 1. Get all members
      const membersRes = await fetch('/api/members');
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      const membersData = await membersRes.json();
      setMembers(membersData.members);

      // 2. Get all gifts in one call
      const giftsRes = await fetch('/api/gifts');
      if (!giftsRes.ok) throw new Error('Failed to fetch gifts');
      const { gifts } = await giftsRes.json();

      // 3. Group gifts by member ID
      const giftCountsByMember = membersData.members.reduce((acc: Record<string, number>, member: any) => {
        acc[member.id] = gifts.filter(
          (gift: any) => 
            gift.forMemberId === member.id && 
            !gift.isPurchased
        ).length;
        return acc;
      }, {});

      setMemberGiftCounts(giftCountsByMember);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(dict?.errors.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [dict]);

  // Split initialization effect from data fetching
  useEffect(() => {
    setMounted(true);
  }, []);

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
    };

    init();
  }, [lang, router]);

  // Separate effect for data fetching
  useEffect(() => {
    if (dict && groupName) {
      fetchData();
    }
  }, [dict, groupName, fetchData]);

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
        [memberId]: data.gifts.filter((gift: Gift) => !gift.isPurchased).length
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
          {members.length > 0 ? (
            <MemberList
              members={members}
              giftCounts={memberGiftCounts}
              dict={dict}
              onMemberClick={handleMemberClick}
              onMemberDeleted={fetchData}
            />
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
