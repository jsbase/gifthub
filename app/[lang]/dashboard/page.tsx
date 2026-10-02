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
import { CropMarks } from '@/components/ui/dialog';
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
      /*
        `!auth.success`, not `!auth`: `verifyAuth` resolves to an object on
        every path, including `{ success: false }` when the request fails or
        the cookie is gone. Testing the object itself was therefore never
        true, the redirect never ran, and an unauthenticated visitor sat on
        `loading` with an empty `groupName` - a spinner that never resolves
        into anything, because the `fetchData` effect is gated on `groupName`
        and nothing ever sets it.
      */
      if (!auth.success) {
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
          THE DESK AND THE SHEET. The board is the album lying open, and the
          contents are a sheet of label stock mounted on it: the sheet is bounded
          by a printed rule and sits inset from every edge, so the board shows
          around it on all four sides. That figure/ground pair is what this route
          was missing. Bare rows printed straight onto the board left the empty
          board below them reading as a page whose contents had run out; the same
          rows on a sheet read as what they are - a short contents list on a piece
          of paper lying on a desk, with the desk visible around the paper.

          The sheet is not stretched. It hugs its contents, because a sheet sized
          to the window would be a panel, and a panel with three rows in it is the
          same unfinished screen with a border drawn round it. The board between
          the sheet and the footer is the rest of the desk, and the footer sits at
          the foot of it.

          On a phone this figure/ground inverts, and it inverts because the
          dialog already said it would: below `sm` a sheet "becomes the whole page
          below the header, squared at the top: a sheet pulled out of an album, not
          a card floating on one" (`ui/dialog.tsx:106`). The gift sheet that opens
          on top of this one is edge to edge; this sheet was inset 32px, so the two
          surfaces the user sees at the same moment were 32px apart. Below `sm`
          there is no desk around the paper - the paper is the page. The rule
          disappears on that edge for the same reason its corners do: a border
          marks a cut edge, and this edge is not cut, it runs off the screen.
        */}
        <section className={cn('flex-1', 'bg-board')}>
          <div className={cn('container', 'mx-auto')}>
            <div
              className={cn(
                'mx-auto',
                'max-w-5xl',
                // No `px-4` here. It sat on top of the `container`'s own 1rem,
                // so the sheet's left edge landed 32px from the screen while the
                // header wordmark sat at 16px - the same "padding the padding"
                // the landing page had already removed. From `sm` up the inset
                // returns: a mounted sheet belongs on the desk, not under the
                // phone's bezel. Below `sm` there is no board above the sheet
                // either: `py-0` puts its top edge on the header's bottom rule
                // and `pb-0` puts the desk back immediately under its foot. A
                // 32px margin on a 375px screen is 8% of the width, and on a
                // sheet that is now the page, it is a margin to nowhere.
                'py-0',
                'sm:px-6',
                'sm:py-12'
              )}
            >
              <div
                className={cn(
                  'relative',
                  'border',
                  'border-rule',
                  'bg-sheet',
                  // Below `sm` this sheet is the whole page, exactly like the
                  // gift sheet that opens on top of it. The dialog primitive
                  // already says so - "a sheet pulled out of an album, not a
                  // card floating on one" - and it means it below `sm` only
                  // (`ui/dialog.tsx:106-127`). This sheet was the one surface
                  // not obeying that: inset 32px on a phone while the sheet
                  // the user is actually inside was edge to edge, 32px apart,
                  // both on screen at once.
                  //
                  // `-mx-4` pulls it back over the container's 1rem, so the
                  // border lands on the viewport edge and the crop marks come
                  // to rest 12px from it - registration marks near the paper
                  // edge, which is what they are for. `px-4` matches the
                  // dialog's `xs:p-4`, so both sheets indent their content by
                  // the same 16px.
                  '-mx-4',
// No rule at all below `sm`, on any of the four edges. With
                  // no gap above, the top border would land on the header's
                  // `border-b` and two 1px rules would read as one thick one;
                  // the foot is the same collision, because on a 375x667 screen
                  // a three-member sheet ends exactly on the footer's
                  // `border-t`. Left and right are simply at the viewport edge,
                  // where a rule has nothing to enclose. A border marks a cut
                  // edge of the paper, and on a phone none of these four is
                  // cut - they all run off the screen or into the furniture
                  // around it. `bg-sheet` against `bg-board` carries the extent
                  // instead, in both themes.
                  'rounded-none',
                  'border-0',
                  'px-4',
                  'py-6',
                  'sm:mx-0',
                  'sm:rounded-lg',
                  'sm:border',
                  // `rounded-lg`, not `rounded-sheet`. globals.css:146 exposes
                  // `--radius-lg: var(--radius-sheet)`, and Tailwind only emits a
                  // utility for a token declared in `@theme`. `--radius-sheet`
                  // lives in `:root` (:320), so `rounded-sheet` is not a class
                  // that exists - `sm:rounded-sheet` compiles to nothing and the
                  // sheet stayed square at every width, while the dialog beside
                  // it (ui/dialog.tsx:146) got its documented 6px. One sheet,
                  // one radius.
                  'sm:rounded-lg',
                  // The same floor the dialog primitive gives every sheet on a
                  // phone, for the same reason. The gift sheet that opens on top
                  // of this one is the whole page below the header, so this
                  // sheet - which is a page, not a card, below `sm` - ends at
                  // the foot of the screen rather than wherever its last member
                  // happens to stop. It used to hug its contents, and at 375x667
                  // with three members that put the third row's rule under the
                  // fold: the sheet looked truncated rather than scrollable,
                  // and there was no way to tell those two apart except by
                  // scrolling and finding out.
                  //
                  // `100dvh`, not `100vh`: on a phone the two differ by the
                  // browser's own chrome, and `100vh` is the taller of them, so
                  // a sheet measured in `vh` is taller than the page it is the
                  // page of - which reintroduces the same clipped foot, one
                  // browser bar lower.
                  'min-h-[calc(100dvh-var(--header-height)-1px)]',
                  'sm:min-h-0',
                  'sm:px-8',
                  'sm:py-7'
                )}
              >
                {/* The same corner furniture the floating sheets carry: four
                    printers' crop marks, and the only thing on this page that
                    says "printed" rather than "styled". */}
                <CropMarks />
                <MemberList
                  members={members}
                  giftCounts={memberGiftCounts}
                  dict={dict}
                  onMemberClick={handleMemberClick}
                  onMemberDeleted={fetchData}
                />
              </div>
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
