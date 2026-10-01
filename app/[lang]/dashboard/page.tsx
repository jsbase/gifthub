'use client';

import { useEffect, useState, use, useCallback, lazy, Suspense } from 'react';
import { NextPage } from 'next';
import { useRouter, usePathname } from 'next/navigation';
import getDictionary from '@/app/[lang]/dictionaries';
import { toast } from 'sonner';
import Header from '@/components/header';
import LoadingSpinner from '@/components/loading-spinner';
import MemberList from '@/components/member-list';
import Footer from '@/components/footer';
import { verifyAuth, logout } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type {
  Member,
  MemberGiftCounts,
  Gift,
  Translations,
  PageProps,
} from '@/types';

const MemberGiftsDialog = lazy(
  () => import('@/components/member-gifts-dialog')
);

const DashboardPage: NextPage<PageProps> = ({ params }) => {
  const { lang } = use(params);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const [dict, setDict] = useState<Translations | null>(null);
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [memberGiftCounts, setMemberGiftCounts] = useState<
    Record<string, MemberGiftCounts>
  >({});
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberGifts, setMemberGifts] = useState<Gift[]>([]);
  const [isRouteChanging, setIsRouteChanging] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Get all members
      const membersRes = await fetch('/api/members');
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      const membersData = await membersRes.json();
      setMembers(membersData.members);

      // Get all gifts
      const giftsRes = await fetch('/api/gifts');
      if (!giftsRes.ok) throw new Error('Failed to fetch gifts');
      const { gifts } = await giftsRes.json();
      const allGifts: Gift[] = gifts;

      /*
        Both numbers, not one. "Nothing left to buy" and "no gift ideas yet" are
        different situations and the row has to be able to say which: a member
        with an empty list is the one who most needs a present.
      */
      const giftCountsByMember = membersData.members.reduce(
        (acc: Record<string, MemberGiftCounts>, member: any) => {
          const own = allGifts.filter((gift) => gift.forMemberId === member.id);
          acc[member.id] = {
            unbought: own.filter((gift) => !gift.isPurchased).length,
            total: own.length,
          };
          return acc;
        },
        {}
      );

      setMemberGiftCounts(giftCountsByMember);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(dict?.errors.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [dict]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      const translations = (await getDictionary(lang)) as Translations;
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

  useEffect(() => {
    if (dict && groupName) {
      fetchData();
    }
  }, [dict, groupName, fetchData]);

  const path = usePathname();

  useEffect(() => {
    setIsRouteChanging(false);
  }, [path]);

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

  const getSelectedMember = () =>
    members.find((m) => m.id === selectedMemberId);

  const updateMemberGiftCount = useCallback(async (memberId: string) => {
    const response = await fetch(`/api/gifts?memberId=${memberId}`);
    if (response.ok) {
      const data = await response.json();
      setMemberGiftCounts((prev) => ({
        ...prev,
        [memberId]: {
          unbought: data.gifts.filter((gift: Gift) => !gift.isPurchased).length,
          total: data.gifts.length,
        },
      }));
    }
  }, []);

  if (loading || !groupName || !dict || isRouteChanging) {
    return <LoadingSpinner />;
  }

  if (!mounted) return null;

  return (
    <div className={cn('min-h-screen', 'bg-board', 'flex flex-col')}>
      <Header
        groupName={groupName}
        dict={dict}
        onLogout={handleLogout}
        showAuth={true}
      />

      <main className={cn('flex', 'flex-1', 'flex-col')}>
        {/*
          The contents page, written on the album board. The band takes the
          remaining height so the footer sits at the foot of the page instead of
          floating behind a field of empty background. There is no sheet under
          it: on this route the board IS the page, and the white cells in the
          member rows are the only label stock on screen.
        */}
        <section className={cn('flex-1', 'bg-board')}>
          <div className={cn('container', 'mx-auto')}>
            <div className={cn('mx-auto', 'max-w-2xl', 'py-8', 'sm:py-12')}>
              <MemberList
                members={members}
                giftCounts={memberGiftCounts}
                dict={dict}
                onMemberClick={handleMemberClick}
                onMemberDeleted={fetchData}
              />
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={<LoadingSpinner />}>
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
            confirmations: dict.confirmations,
            close: dict.close,
            giftCount: dict.giftCount,
          }}
        />
      </Suspense>

      <Footer dict={dict} />
    </div>
  );
};

export default DashboardPage;
