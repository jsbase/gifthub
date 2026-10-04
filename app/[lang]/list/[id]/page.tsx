'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { NextPage } from 'next';
import { useRouter, usePathname } from 'next/navigation';
import getDictionary from '@/app/[lang]/dictionaries';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/loading-spinner';
import { SheetFrame } from '@/components/list-sheet';
import ListSheet from '@/components/list-sheet';
import ShareListDialog from '@/components/share-list-dialog';
import ConfirmDialog from '@/components/confirm-dialog';
import { verifyAuth, logout } from '@/lib/auth';
import type {
  Gift,
  ListAccess,
  ListGroupAccess,
  ListPageProps,
  ListSummary,
  Translations,
} from '@/types';

/**
 * The sheet of one list.
 *
 * **It is a page and not a dialog, and the reason is a share.** A dialog could
 * only be reached from the contents page, so a buyer could never be sent to a
 * list - they had to already be signed in, already be on the contents page, and
 * find it there. With a route the list has an address, and that is what "shared
 * with you by email" has to mean in a product where there is no mail to click:
 * somebody who has your address can be handed a link, and the whole promise in
 * `shareList.shareLead` depends on the list existing somewhere to be linked to.
 *
 * **A 404 sends the reader back to their own lists and says nothing more.** The
 * server refuses with `not_found` for an account with no relationship to a list
 * so that somebody else's list is never confirmed to exist, and `errors.notFound`
 * is worded to match - it says the list does not exist and never that the reader
 * lacks access. Both facts travel together on purpose: an error page that said
 * "you don't have permission" would answer the question the refusal exists to
 * refuse.
 *
 * The prop type of this route is `ListPageProps` from `types.ts`, not `PageProps`.
 * `PageProps` is declared by hand precisely so that it shadows the global Next 16
 * generates into `.next/types/routes.d.ts`, and adding `id` to it would make the
 * dashboard and the landing page claim a second segment neither of them has. So the
 * route with a second segment gets its own name, which is the third use of the same
 * idea: a page that does not import a `PageProps` resolves to the generated global
 * instead, which is parameterised by route and would not carry `id`.
 */
const ListPage: NextPage<ListPageProps> = ({ params }) => {
  const { lang, id } = use(params);
  const router = useRouter();
  const path = usePathname();

  const [dict, setDict] = useState<Translations | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [list, setList] = useState<ListSummary | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [access, setAccess] = useState<ListAccess[]>([]);
  const [groupAccess, setGroupAccess] = useState<ListGroupAccess[]>([]);
  const [loading, setLoading] = useState(true);
  /*
    Where this sheet is navigating to, if anywhere, rather than a boolean an
    effect has to clear afterwards - the same reasoning as the contents page: the
    sheet is a full page with its own frame, so the route change has to be visible
    as soon as it is asked for, and a path is the one thing `usePathname` already
    knows.
  */
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const isRouteChanging = pendingPath !== null && pendingPath !== path;

  const [isSharing, setIsSharing] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/lists/${id}`);

      /*
        `access` and `groupAccess` are optional because the API only returns them to
        the owner, and a buyer reading somebody else's list gets neither. Defaulting
        both to empty lists is what makes the audience a consequence of `isOwner`
        rather than of the response shape.

        They are two arrays rather than one because a group is one grant reaching
        several people: folding the rows together would either print the same reader
        twice or lose the row that withdraws all of them at once. See
        `ListGroupAccess` in `types.ts`.
      */
      const body = (await response.json().catch(() => null)) as {
        list: ListSummary;
        gifts: Gift[];
        access?: ListAccess[];
        groupAccess?: ListGroupAccess[];
      } | null;

      if (!response.ok || !body) {
        throw new Error('Failed to fetch list');
      }

      setList(body.list);
      setGifts(body.gifts);
      setAccess(body.access ?? []);
      setGroupAccess(body.groupAccess ?? []);
    } catch (error) {
      console.error('Error fetching list:', error);
      /*
        `getDictionary` is called for its failure sentence rather than closed over
        from `dict`. It is a memoised per-locale import - the module caches the
        promise - so this is a cache hit and not a second load, and it keeps this
        callback's identity stable while the dictionary is still arriving, which is
        what lets the boot effect below call it without re-fetching the sheet every
        time a translation settles.
      */
      const { errors } = await getDictionary(lang);
      toast.error(errors.notFound);
      router.replace(`/${lang}/dashboard`);
    } finally {
      setLoading(false);
    }
  }, [id, lang, router]);

  useEffect(() => {
    const init = async () => {
      const translations = await getDictionary(lang);
      setDict(translations);

      /*
        `proxy.ts` decides this on the presence of a cookie, not on the contents
        of one, and a cookie that does not verify leaves a half-signed-in state
        the proxy cannot see. So the page verifies it - the same gate the contents
        page runs, for the same reason.
      */
      const auth = await verifyAuth();
      if (!auth.success) {
        router.replace(`/${lang}`);
        toast.error(translations.errors.loginRequired);
        return;
      }

      setDisplayName(auth.displayName ?? '');

      /*
        The sheet is fetched here rather than from a second effect waiting for the
        name to arrive. It is one boot with one failure path - dictionary, then
        session, then the sheet - and a second effect keyed on two pieces of state
        that arrive independently is a second place for the boot to get stuck.
      */
      await fetchData();
    };

    init();
  }, [lang, router, fetchData]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace(`/${lang}`);
    toast.success(dict?.success.loggedOut);
  }, [dict, lang, router]);

  const handleBackToLists = useCallback(() => {
    const destination = `/${lang}/dashboard`;
    setPendingPath(destination);
    router.push(destination);
  }, [lang, router]);

  /*
    Deleting the list this sheet is on. The sheet is the only place in the product
    where the list being destroyed is the thing the reader is looking at, so this
    is the path that most needs the confirmation and the path after it has to leave
    somewhere: the reader is sent back to their own lists, where the list is gone
    from both halves - they owned it, and it is not waiting for them under "shared
    with you" either.
  */
  const handleDeleteList = useCallback(async () => {
    try {
      const response = await fetch(`/api/lists/${id}`, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to delete list');

      toast.success(dict?.toasts.listDeleted);
      setPendingPath(`/${lang}/dashboard`);
      router.replace(`/${lang}/dashboard`);
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error(dict?.toasts.listDeleteFailed);
    }
  }, [dict, id, lang, router]);

  if (loading || !displayName || !dict || !list || isRouteChanging) {
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
      <ListSheet
        list={list}
        gifts={gifts}
        access={access}
        groupAccess={groupAccess}
        isOwner={list.isOwner}
        dict={dict}
        onClose={handleBackToLists}
        onGiftAdded={fetchData}
        onGiftChanged={fetchData}
        onGiftDeleted={fetchData}
        onDeleteList={() => setPendingDeletion(true)}
        onShareList={() => setIsSharing(true)}
        onVisibilityChanged={fetchData}
      />

      {/*
        The audience is already on this page - `GET /api/lists/[id]` returns it to
        the owner - so the share sheet is opened with what the sheet is holding
        rather than with a fetch, and every change to it comes back as a refetch
        of the same request.
      */}
      {isSharing && (
        <ShareListDialog
          isOpen
          onClose={() => setIsSharing(false)}
          listId={list.id}
          listName={list.name}
          visibility={list.visibility}
          access={access}
          groupAccess={groupAccess}
          dict={dict}
          onChanged={fetchData}
          onVisibilityChanged={fetchData}
        />
      )}

      <ConfirmDialog
        isOpen={pendingDeletion}
        onClose={() => setPendingDeletion(false)}
        onConfirm={handleDeleteList}
        title={dict.removeListConfirm}
        description={dict.confirmations.deleteListNamed.replace(
          '{name}',
          list.name
        )}
        confirmLabel={dict.deleteList}
        cancelLabel={dict.cancel}
      />
    </SheetFrame>
  );
};

export default ListPage;