'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter, usePathname } from 'next/navigation';
import getDictionary from '@/app/[lang]/dictionaries';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/loading-spinner';
import { SheetFrame } from '@/components/list-sheet';
import ListBoard from '@/components/list-board';
import CreateListDialog from '@/components/create-list-dialog';
import ShareListDialog from '@/components/share-list-dialog';
import ConfirmDialog from '@/components/confirm-dialog';
import { verifyAuth, logout } from '@/lib/auth';
import type {
  ListAccess,
  ListSummary,
  PageProps,
  Translations,
} from '@/types';

/**
 * The contents page: the lists this account owns, and the lists other people have
 * shared with it.
 *
 * **One request, where the old page made two.** It fetched `/api/members` and
 * then `/api/gifts` and counted the gifts per member in the browser, which put a
 * second hand-rolled copy of the counting rule on the client next to the one in
 * `lib/gift-count.ts` - the class of thing that module's own header comment was
 * rewritten to prevent. `GET /api/lists` returns both halves with their counts
 * already on each row, counted once on the server by `toSummary`, so a row reads
 * `giftCounts` and nothing counts anything here.
 *
 * The page owns the three overlays - create, share, delete - and the refetch after
 * each of them, because `ListBoardProps` reports the intent of every action rather
 * than performing it: a list deletion cascades to every idea on the sheet it
 * destroys, and that request belongs next to whatever is said afterwards.
 */
const DashboardPage: NextPage<PageProps> = ({ params }) => {
  const { lang } = use(params);
  const router = useRouter();
  const path = usePathname();

  const [dict, setDict] = useState<Translations | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [shared, setShared] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  /*
    Where this page is navigating to, if anywhere, rather than a boolean that an
    effect has to clear afterwards. The sheet of a list is a full page with its own
    frame, so the contents page must hand over immediately rather than stay on
    screen underneath it - and a boolean could only be reset by watching the path
    and setting state when it changed, which is a second source of truth about
    something `usePathname` already knows. Comparing the two is the whole gate,
    and it needs no effect at all.
  */
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const isRouteChanging = pendingPath !== null && pendingPath !== path;

  /* The three overlays, each one a list the page is acting on - or, for the create
     sheet, the absence of one. */
  const [isCreating, setIsCreating] = useState(false);
  const [shareTarget, setShareTarget] = useState<ListSummary | null>(null);
  const [shareAccess, setShareAccess] = useState<ListAccess[]>([]);
  const [pendingDeletion, setPendingDeletion] = useState<ListSummary | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/lists');
      if (!response.ok) throw new Error('Failed to fetch lists');

      const data = (await response.json()) as {
        owned: ListSummary[];
        shared: ListSummary[];
      };
      setLists(data.owned);
      setShared(data.shared);
    } catch (error) {
      console.error('Error fetching data:', error);
      /*
        `getDictionary` for the failure sentence rather than closing over `dict`,
        and the reason is the identity of this callback: the sheet and the board
        both hand it on as "something changed", so it must not move when the
        dictionary lands or the boot below would fetch everything twice. The module
        caches its per-locale promise, so this is a cache hit and not a load.
      */
      const { errors } = await getDictionary(lang);
      toast.error(errors.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    const init = async () => {
      const translations = await getDictionary(lang);
      setDict(translations);

      const auth = await verifyAuth();
      /*
        `!auth.success`, not `!auth`: `verifyAuth` resolves to an object on every
        path, including `{ success: false }` when the request fails or the cookie
        is gone. Testing the object itself was therefore never true, the redirect
        never ran, and an unauthenticated visitor sat on `loading` forever behind a
        spinner that could not resolve into anything, because the only thing that
        set the display name was the code that never ran.
      */
      if (!auth.success) {
        router.replace(`/${lang}`);
        toast.error(translations.errors.loginRequired);
        return;
      }

      setDisplayName(auth.displayName ?? '');

      /*
        The contents are fetched here rather than from a second effect waiting for
        the name to arrive. It is one boot with one failure path - dictionary, then
        session, then both halves of the contents page - and two effects keyed on
        state that arrives independently are two places for the boot to get stuck.
      */
      await fetchData();
    };

    init();
  }, [lang, router, fetchData]);

  /*
    Opening the audience of one list is a second request, and the contents page
    could not avoid it: `GET /api/lists` returns two arrays of summaries and no
    access rows, and the rows are owner-only in the API as well as in the
    interface. So asking for one list's audience is a fetch - done here rather
    than inside the dialog, because the dialog is handed its `access` as a prop
    and should not also be the thing that goes looking for it.
  */
  const openShareSheet = useCallback(
    async (listId: string) => {
      try {
        const response = await fetch(`/api/lists/${listId}`);
        if (!response.ok) throw new Error('Failed to fetch list');

        const data = (await response.json()) as {
          list: ListSummary;
          access?: ListAccess[];
        };
        setShareTarget(data.list);
        setShareAccess(data.access ?? []);
      } catch (error) {
        console.error('Error opening the share sheet:', error);
        toast.error(dict?.errors.failedToLoad);
      }
    },
    [dict]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace(`/${lang}`);
    toast.success(dict?.success.loggedOut);
  }, [dict, lang, router]);

  /*
    The route change is announced by naming the destination, not by flipping a
    flag: see `pendingPath` above for why that is the same amount of state and
    one fewer effect.
  */
  const handleOpenList = useCallback(
    (listId: string) => {
      const destination = `/${lang}/list/${listId}`;
      setPendingPath(destination);
      router.push(destination);
    },
    [lang, router]
  );

  const handleDeleteList = useCallback(async () => {
    if (!pendingDeletion) return;

    try {
      const response = await fetch(`/api/lists/${pendingDeletion.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete list');

      toast.success(dict?.toasts.listDeleted);
      setPendingDeletion(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error(dict?.toasts.listDeleteFailed);
    }
  }, [dict, fetchData, pendingDeletion]);

  if (loading || !displayName || !dict || isRouteChanging) {
    return <LoadingSpinner />;
  }

  return (
    <SheetFrame
      header={{
        displayName,
        dict,
        onLogout: handleLogout,
        showAuth: true,
      }}
      dict={dict}
    >
      <ListBoard
        lists={lists}
        shared={shared}
        dict={dict}
        onOpenList={handleOpenList}
        onCreateList={() => setIsCreating(true)}
        onShareList={openShareSheet}
        onDeleteList={(listId) =>
          setPendingDeletion(
            lists.find((list) => list.id === listId) ??
              shared.find((list) => list.id === listId) ??
              null
          )
        }
        onListChanged={fetchData}
      />

      <CreateListDialog
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        dict={dict}
        onCreated={(listId) => {
          setIsCreating(false);
          /*
            Straight to the sheet the new list is on: it is the thing the owner
            has just written down, and the empty sheet behind it says what to do
            with it. The id is used only if the create response carried one - a
            list that exists without an id we can read is still a list, so the
            board is re-read and the reader picks it up from there.
          */
          if (listId) {
            handleOpenList(listId);
            return;
          }
          fetchData();
        }}
      />

      {shareTarget && (
        <ShareListDialog
          isOpen
          onClose={() => setShareTarget(null)}
          listId={shareTarget.id}
          listName={shareTarget.name}
          visibility={shareTarget.visibility}
          access={shareAccess}
          dict={dict}
          onChanged={async () => {
            /*
              Both halves, in that order, and the second one is the reason this is
              not just `fetchData`.

              A grant or a revoke changes two things: the board's copy of the list,
              and the audience this dialog is showing. Re-reading only the board left
              the dialog holding the audience it was opened with, so adding a person
              appeared to do nothing until the dialog was closed and reopened - on
              the one screen whose entire purpose is showing you who can see the
              list. `openShareSheet` after the re-read is the same two lines the
              visibility handler below runs, and for the same reason.
            */
            await fetchData();
            if (shareTarget) openShareSheet(shareTarget.id);
          }}
          onVisibilityChanged={async () => {
            /*
              Re-read rather than patch the dialog's copy. The share sheet asked
              for the visibility change on the owner's behalf and closed; the
              audience that came with it is now different, and a list whose
              visibility is stale in one place is a list whose dialog offers to
              share a list the API considers private.
            */
            await fetchData();
            openShareSheet(shareTarget.id);
          }}
        />
      )}

      {/*
        The one irreversible action in the product, and the only one that
        confirms. It cascades: every idea on the sheet goes with the sheet, there
        is no second copy and no undo, and the confirmation says both - it is not
        asking whether the reader is sure, it is stating what will be destroyed
        and that it cannot be brought back.
      */}
      <ConfirmDialog
        isOpen={pendingDeletion !== null}
        onClose={() => setPendingDeletion(null)}
        onConfirm={handleDeleteList}
        title={dict.removeListConfirm}
        description={dict.confirmations.deleteList}
        confirmLabel={dict.deleteList}
        cancelLabel={dict.cancel}
      />
    </SheetFrame>
  );
};

export default DashboardPage;