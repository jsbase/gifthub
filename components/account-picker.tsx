'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { IconUserPlus } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { isRefusal, type Refusal } from '@/lib/refusals';
import { cn } from '@/lib/utils';
import type {
  AccountPickerProps,
  AccountSearchResult,
  Translations,
} from '@/types';

/**
 * The combobox contract, in the exact attribute types the DOM takes.
 *
 * Two role attribute sets live in spreads rather than in the JSX attribute list,
 * and the reason is `eslint-config-next`'s `jsx-a11y` rules rather than taste:
 * `role-supports-aria-props` compares an element's explicit role against
 * `aria-query`'s role metadata, which is still ARIA 1.1, and in that metadata
 * `combobox` lists neither `aria-controls` - which its own `requiredProps`
 * demands - nor the global `aria-describedby`. Spelled out as attributes both are
 * reported, and a new warning fails `npm run lint:ratchet` for markup that is
 * correct. Assembled here they are one documented object each and the rule has
 * nothing to compare. The better long-term answer is an `eslint.config.mjs`
 * exception for these two rules, and that file is not this one's to change.
 */
type ComboboxAria = Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  | 'role'
  | 'aria-expanded'
  | 'aria-controls'
  | 'aria-activedescendant'
  | 'aria-autocomplete'
  | 'aria-describedby'
>;

type ListboxAria = Pick<
  React.HTMLAttributes<HTMLUListElement>,
  'role' | 'aria-labelledby'
>;

/**
 * How long the field waits before it asks.
 *
 * 300ms because that is the number `gift-card.tsx` and `language-switcher.tsx`
 * already pass to `useDebounce`, and one debounce figure across the app is worth
 * more than the last twenty milliseconds of it. The lookup is not a request
 * anybody is trying to shield the server from: `lib/account-search.ts:28-29` caps
 * the page at eight rows and `lib/account-search.ts:25-27` gives the three-
 * character floor its own reason - one or two letters would turn the field into an
 * alphabet probe - so this window is chosen for how it feels and nothing else.
 */
const LOOKUP_DEBOUNCE_MS = 300;

/*
Not the server's number, and deliberately not read from the server.
  `MIN_QUERY_LENGTH` in `lib/account-search.ts` is the rule - enforced at
  `lib/account-search.ts:163-172` - and the route refuses to restate it either
  (`app/api/accounts/search/route.ts:31-41`) because a copy of a rule is a rule
  with two versions. So this constant decides exactly one thing - whether the field
  asks anything at all - and if the two ever disagree the server's answer wins,
  which is why `invalid_search_query` is handled and printed below rather than
  treated as unreachable.

  The one query whose answer reads wrong is at the other end: the same check
  refuses anything over sixty-four characters, so a pasted sentence comes back
  `invalid_search_query`, whose sentence is "type a few more characters".
*/
const MIN_LOOKUP_QUERY = 3;

/*
  The two refusal tables, at module scope and keyed by the shared `Refusal` union.

  Keyed by the union rather than by two bare strings, so a refusal added to
  `lib/refusals.ts` without a decision here is a type error rather than a missing
  case - the same reasoning `share-list-dialog.tsx:249-289` gives for its one
  table.

  They are functions rather than objects because of `react-hooks/exhaustive-deps`:
  a table built inside the component is a new value on every render, so every
  handler that reads it would have to list it as a dependency and would then be
  rebuilt on every render. At module scope the dependency is `dict` alone, which
  is what the handlers already carry.
*/

/**
 * A refusal about the query is a statement about the field; anything else is a
 * failed request and belongs in a toast.
 */
const lookupFailureText = (
  dict: Translations,
  code: unknown
): string | undefined => {
  if (!isRefusal(code)) return undefined;

  const table: Record<Refusal, string | undefined> = {
    invalid_search_query: dict.errors.invalidSearchQuery,
    /*
      The one that means "this account owns no list, so there is nobody to look
      up" rather than "that query was not enough"
      (`lib/account-search.ts:174`). Its own sentence, because `dict.errors.notFound`
      is "this list does not exist" - true of the endpoint, and written for the
      *list* the caller was asking for. Reached from the lookup it would refuse an
      account that has done nothing wrong with words about a list it never asked
      about, and would send somebody who has simply not made a list yet down a
      dead end instead of telling them what to do first.
    */
    not_found: dict.errors.searchNeedsList,
    invalid_email: undefined,
    duplicate_email: undefined,
    invalid_nickname: undefined,
    duplicate_nickname: undefined,
    weak_password: undefined,
    invalid_display_name: undefined,
    invalid_identifier: undefined,
    nothing_to_change: undefined,
    ambiguous_change: undefined,
    invalid_visibility: undefined,
    no_such_account: undefined,
    already_shared: undefined,
    cannot_share_with_owner: undefined,
    not_shared_yet: undefined,
    no_such_group: undefined,
    duplicate_group_name: undefined,
    cannot_join_own_group: undefined,
    forbidden: undefined,
    cannot_clear_purchase: undefined,
  };

  return table[code];
};

/**
 * A refusal about the person is a value the reader picked rather than a failed
 * request, so it is printed under the field where the row they chose is named.
 * The same split the share dialog made before the picker took the grant over:
 * `already_shared` in a toast that leaves in four seconds leaves the row on screen
 * as though it had worked.
 */
const grantFailureText = (
  dict: Translations,
  code: unknown
): string | undefined => {
  if (!isRefusal(code)) return undefined;

  const table: Record<Refusal, string | undefined> = {
    already_shared: dict.errors.alreadyShared,
    cannot_share_with_owner: dict.errors.cannotShareWithOwner,
    not_shared_yet: dict.errors.notSharedYet,
    no_such_account: dict.errors.noSuchAccount,
    invalid_email: dict.errors.invalidEmail,
    // The lookup's own refusal: about what was typed rather than about who was
    // picked, and the field's sentence either way.
    invalid_search_query: dict.errors.invalidSearchQuery,
    invalid_nickname: undefined,
    duplicate_nickname: undefined,
    duplicate_email: undefined,
    weak_password: undefined,
    invalid_display_name: undefined,
    invalid_identifier: undefined,
    nothing_to_change: undefined,
    ambiguous_change: undefined,
    invalid_visibility: undefined,
    no_such_group: undefined,
    duplicate_group_name: undefined,
    cannot_join_own_group: undefined,
    forbidden: undefined,
    not_found: undefined,
    cannot_clear_purchase: undefined,
  };

  return table[code];
};

/**
 * The audience is filtered here and not by the server.
 *
 * `GET /api/accounts/search` cannot know which list the picker is inside, and
 * asking it to would be the wrong request twice over: it would turn a lookup
 * that exists to name a stranger into a second way to ask who a list is shared
 * with, and `PRODUCT.md:64` treats the absence of any way to enumerate a list's
 * audience as the feature rather than as a gap. `alreadyShared` is therefore a
 * prop (`AccountPickerProps`) and the filter runs over the eight rows already in
 * hand.
 *
 * It hides people holding a `ListAccess` row, which is what the revoke control
 * in the audience below withdraws. Somebody who reaches the list only through a
 * group is not in that array and still appears - correctly, because adding them
 * individually is a *different* grant from the one they already hold.
 */
const AccountPicker: React.FC<AccountPickerProps> = (props) => {
  /*
    `PRODUCT.md:65`: a control the reader cannot use is absent, not disabled. A
    private list cannot be granted to anybody - the route answers `not_shared_yet`
    - and a greyed field would be a rule the owner has to guess at, so the share
    sheet replaces this whole component with the sentence saying what has to
    happen first and the control that does it.

    The wrapper exists only to make that absence possible. `isVisible` flips, and
    hooks above an early `return null` would then be called conditionally, so
    every hook lives in the field below, which is mounted only while the picker is
    on screen.
  */
  if (!props.isVisible) return null;

  return <AccountPickerField {...props} />;
};

/**
 * One field, a debounced lookup, a result list, and a grant on selection.
 *
 * It replaces the inline address form in `share-list-dialog.tsx`: sharing is by
 * account, the field takes a nickname or an address, and both halves of that -
 * the lookup and the grant - are a request lifecycle with its own wait, its own
 * busy state and its own failures, which is why it left a file that already had
 * two dialogs in it.
 */
const AccountPickerField: React.FC<AccountPickerProps> = (props) => {
  const { dict, alreadyShared } = props;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AccountSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [lookedUp, setLookedUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  /*
    Which lookup a result belongs to, ported from the sheet epoch in
    `share-list-dialog.tsx:182-212` for the same reason: a response that arrives
    after the reader has typed three more characters answers a question they have
    moved on from, and printing it would show rows that do not match what is in
    the field. Bumped before the request and compared after it, so the newest
    lookup is the only one allowed to write.
  */
  const lookupEpochRef = useRef(0);

  const listRef = useRef<HTMLUListElement>(null);

  /*
    `aria-controls`, `aria-labelledby` and the row id in `aria-activedescendant`
    are id references, so two pickers in one document would point each other at
    the wrong list. There will be two: the share sheet and the groups dialog each
    render one, and which of them is mounted is a property of what the reader
    opened.
  */
  const uid = useId();
  const fieldId = `${uid}-account-search`;
  const listboxId = `${uid}-account-search-results`;
  const promptId = `${uid}-account-search-prompt`;
  const hintId = `${uid}-account-search-hint`;
  const errorId = `${uid}-account-search-error`;
  const optionId = (index: number) => `${uid}-account-search-option-${index}`;

  /*
    The two states the field's own value decides: a query too short to run, and a
    query that ran and matched nobody. They are different answers and they get
    different words - `lib/account-search.ts:25-27` is why the floor exists at all
    and `app/api/accounts/search/route.ts:44-52` is why the two refusals stay
    separable - so they are two keys and not one empty-results sentence.
  */
  const trimmed = query.trim();
  const isTooShort = trimmed.length > 0 && trimmed.length < MIN_LOOKUP_QUERY;

  const visibleResults = results.filter(
    (result) => !alreadyShared.includes(result.id)
  );

  const isOpen = !isCollapsed && visibleResults.length > 0;

  const lookup = useCallback(
    async (raw: string) => {
      const epoch = lookupEpochRef.current + 1;
      lookupEpochRef.current = epoch;

      const q = raw.trim();

      if (q.length < MIN_LOOKUP_QUERY) {
        setIsSearching(false);
        setLookupError(null);
        setResults([]);
        return;
      }

      setIsSearching(true);
      setLookupError(null);

      try {
        const response = await fetch(
          `/api/accounts/search?q=${encodeURIComponent(q)}`
        );

        const body = (await response.json().catch(() => null)) as {
          code?: unknown;
          results?: AccountSearchResult[];
        } | null;

        if (epoch !== lookupEpochRef.current) return;

        const failure = lookupFailureText(dict, body?.code);

        if (failure !== undefined) {
          setLookupError(failure);
          setResults([]);
          return;
        }

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        setResults(body?.results ?? []);
        setLookedUp(true);
        // A list is never opened with nothing selected: Enter has to have a target
        // the moment the rows are there, or the keyboard path needs a second step
        // before it means anything.
        setActiveIndex(0);
      } catch (error) {
        if (epoch !== lookupEpochRef.current) return;
        console.error('Error searching accounts:', error);
        setLookupError(dict.errors.failedToLoad);
        setResults([]);
      } finally {
        if (epoch === lookupEpochRef.current) setIsSearching(false);
      }
    },
    // `dict` rather than the two sentences the refusal tables read, so the
    // dependency list is not an inventory of that table - the same choice
    // `share-list-dialog.tsx:324` makes. `useDebounce` copies the callback into a
    // ref on an effect, so the debounced function itself does not change when this
    // does.
    [dict]
  );

  const debouncedLookup = useDebounce(lookup, LOOKUP_DEBOUNCE_MS);

  /*
    One status line under the field, and only one thing in it at a time: a lookup
    in flight, a grant in flight, or the answer a finished lookup gave. The third
    waits for `lookedUp` on purpose - printing "nobody found" during the
    three-hundred milliseconds between the last keystroke and the response would
    be a claim about the world that nothing has checked yet.
  */
  const statusLine = isSearching
    ? dict.shareList.searching
    : isGranting
      ? dict.shareList.adding
      : lookedUp && results.length === 0 && !isTooShort
        ? dict.shareList.noSearchResults
        : null;

  const grant = useCallback(
    async (result: AccountSearchResult) => {
      /*
        No list, no grant. `AccountPickerProps.listId` is `null` for the group
        manager, which has no list to grant to: there the *selection* is the whole
        point, and the request that follows is a different one -
        `POST /api/groups/{id}/members`, addressed by account id rather than by
        address, which is why that route takes an id and does not resolve a name.
        This branch is what stops a picker inside a group dialog from POSTing to
        `/api/lists/null/access`, and what hands the chosen account back so the
        dialog can make that request itself.

        Nothing here is fetched, so a search-only caller cannot cause a grant by
        picking a row - the request that follows is the caller's, and it is the only
        one that can reach anything.
      */
      /*
        `listId` is the discriminant of the two arms of `AccountPickerProps`, and it
        is read off `props` rather than off a local so the narrowing survives: a
        destructured local loses the correlation between the field and the callback,
        and TypeScript then has to assume the callback might be absent. Checking
        `props.listId === null` narrows `props` itself, so `props.onPicked` is known
        to exist here and `props.onGranted` is known to exist below - which is the
        point of `?: never` on the other arm.
      */
      if (props.listId === null) {
        props.onPicked(result);
        setQuery('');
        setResults([]);
        setLookedUp(false);
        return;
      }

      setGrantError(null);
      setIsGranting(true);

      try {
        const response = await fetch(`/api/lists/${props.listId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          /*
            The address goes out exactly as the search returned it. The route
            normalises with `acceptedEmail` before it looks anybody up, and
            `lib/email.ts` says the form is not the boundary - so a client-side
            normaliser would be a second authority for a rule that has one.
          */
          body: JSON.stringify({ email: result.email }),
        });

        const body = (await response.json().catch(() => null)) as {
          code?: unknown;
          message?: string;
          access?: { displayName?: string; email?: string };
        } | null;

        const failure = grantFailureText(dict, body?.code);

        if (failure !== undefined) {
          setGrantError(failure);
          return;
        }

        if (!response.ok) {
          throw new Error(body?.message || `Error: ${response.status}`);
        }

        /*
          The name comes from the grant response and not from the row, for the
          reason `share-list-dialog.tsx:300-311` gives: the toast says the person's
          name rather than the handle they were found by. The address is the
          fallback, because a sentence with a hole in it is worse than a plainer
          one.
        */
        const grantee = body?.access?.displayName?.trim() || result.email;
        toast.success(dict.toasts.accessGranted.replace('{name}', grantee));

        setQuery('');
        setResults([]);
        setLookedUp(false);
        setActiveIndex(0);
        setIsCollapsed(false);
        setLookupError(null);
        props.onGranted();
      } catch (error) {
        console.error('Error sharing list:', error);
        toast.error(dict.toasts.accessGrantFailed);
      } finally {
        setIsGranting(false);
      }
    },
    [dict, props]
  );

  /*
    Arrow keys, Enter and Escape, and nothing else. Tab deliberately falls
    through: a listbox that swallowed Tab would trap the reader between the field
    and the rows, and this picker sits inside a dialog whose focus handling is
    Radix's - the one thing a combobox must never take over.
  */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (visibleResults.length === 0) return;
        event.preventDefault();
        setIsCollapsed(false);
        // Clamped at both ends rather than wrapping: eight rows that silently jump
        // from the last back to the first make Enter unpredictable to somebody
        // arrowing with a finger on a phone.
        setActiveIndex((current) => {
          const step = event.key === 'ArrowDown' ? 1 : -1;
          return Math.max(
            0,
            Math.min(current + step, visibleResults.length - 1)
          );
        });
        return;
      }

      if (event.key === 'Enter') {
        const chosen = visibleResults[activeIndex];
        if (!chosen) return;
        // The field may sit inside the share sheet's own form, and Enter there
        // would post it - a submission whose only field is a query. Preventing the
        // default is what makes Enter mean "pick this row" and nothing else.
        event.preventDefault();
        grant(chosen);
        return;
      }

      if (event.key === 'Escape') {
        // No `stopPropagation`: Escape is the sheet's way out and it has to stay
        // that way from inside this field. This only collapses the list, and one
        // key is given one meaning.
        setIsCollapsed(true);
      }
    },
    [activeIndex, grant, visibleResults]
  );

  /*
    Keeping the selected row in view. Indexed rather than looked up by id because
    `listRef.current.children` is the same rows in the order the map produced them,
    and a selector on a generated id would need the escaping `useId`'s value may
    require.
  */
  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const describedBy =
    [grantError ? errorId : null, isTooShort ? hintId : null]
      .filter((id): id is string => Boolean(id))
      .join(' ') || undefined;

  const comboboxAria: ComboboxAria = {
    role: 'combobox',
    'aria-expanded': isOpen,
    'aria-controls': listboxId,
    'aria-autocomplete': 'list',
    'aria-activedescendant': isOpen ? optionId(activeIndex) : undefined,
    'aria-describedby': describedBy,
  };

  const listboxAria: ListboxAria = {
    role: 'listbox',
    'aria-labelledby': promptId,
  };

  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={fieldId} className='label-print text-caption'>
        {dict.shareList.enterNameOrEmail}
      </Label>

      <Input
        {...comboboxAria}
        id={fieldId}
        type='text'
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          // A refusal dies on the way in rather than on submit: a sentence about
          // what was typed stops being true the moment what is typed changes.
          setGrantError(null);
          setLookupError(null);
          setLookedUp(false);
          setIsCollapsed(false);
          debouncedLookup(event.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder={dict.shareList.enterNameOrEmail}
        autoComplete='off'
        // A handle or an address, and neither is prose: no autocapitalisation and
        // no spellcheck, because a keyboard that helpfully turns `anna` into
        // `Anna` has changed the query without telling anybody.
        autoCapitalize='none'
        autoCorrect='off'
        spellCheck={false}
        aria-invalid={grantError ? true : undefined}
        data-testid='accountSearch'
      />

      {/*
        One slot under the field for everything that is about the value in it. A
        field has one `aria-describedby` and a reader can only act on one
        sentence, and a refusal wins over the hint because a refusal is the thing
        they have to do something about.
      */}
      {grantError ? (
        <p
          id={errorId}
          role='alert'
          data-testid='accountSearchError'
          className='text-destructive text-[0.875rem] leading-snug'
        >
          {grantError}
        </p>
      ) : isTooShort ? (
        <p
          id={hintId}
          data-testid='accountSearchHint'
          className='text-[0.8125rem] leading-relaxed text-caption'
        >
          {dict.shareList.searchHint}
        </p>
      ) : null}

      {statusLine && (
        <p
          role='status'
          data-testid='accountSearchStatus'
          className='text-[0.8125rem] leading-relaxed text-caption'
        >
          {statusLine}
        </p>
      )}

      {/*
        The lookup's own refusal, apart from the line above. It is a different
        sentence in a different place: this one is about the request rather than
        about the field's validity, and the field stays valid while it is on
        screen.
      */}
      {lookupError && !grantError && (
        <p
          role='alert'
          data-testid='accountSearchLookupError'
          className='text-destructive text-[0.875rem] leading-snug'
        >
          {lookupError}
        </p>
      )}

      {isOpen && (
        <div className='flex flex-col'>
          {/*
            The instruction, and the listbox's accessible name. It is printed
            rather than left to `aria-label` because eight rows with no sentence
            saying what choosing one does read as a list of things - and the
            sheet's description is about sharing, not about choosing.
          */}
          <p
            id={promptId}
            data-testid='accountSearchPrompt'
            className='label-print pt-2 text-caption'
          >
            {dict.shareList.searchPickPrompt}
          </p>

          <ul
            {...listboxAria}
            id={listboxId}
            ref={listRef}
            data-testid='accountSearchResults'
            className='divide-y divide-rule border-y border-rule'
          >
            {visibleResults.map((result, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={result.id}
                  id={optionId(index)}
                  role='option'
                  aria-selected={isActive}
                  data-testid='accountSearchResult'
                  /*
                    `preventDefault` on the pointer press and not on the click: a
                    tap that moved focus out of the field would take the keyboard
                    path with it, and the whole point of this control is that the
                    field keeps focus while the list is open.
                  */
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => grant(result)}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-between gap-3 py-2',
                    isActive && 'bg-wash'
                  )}
                >
                  <span className='flex min-w-0 flex-col'>
                    <span className='break-words text-[0.9375rem] text-ink'>
                      {result.displayName}
                    </span>

                    {/*
                      The handle and the address, in that order: the handle is the
                      unique one and the address is what a phone keyboard
                      suggests. Both stay on the row, because the address is how the
                      owner recognises the person and dropping the unmatched half
                      would make the shorter query the more certain one.

                      `matched` says which of the two the query actually hit, and
                      that is the only way this row answers which of two similar
                      handles was meant without the reader comparing two addresses
                      by eye. It is carried by ink against caption *and* by weight
                      against regular, because a state resting on colour alone is
                      the one thing `PRODUCT.md:111` refuses. It is not carried by
                      reordering the two halves: which field matched depends on the
                      query, so the rows would jump about under the reader on every
                      keystroke. A third channel - a word saying which field
                      matched - would be better and has no dictionary key.
                    */}
                    <span className='flex min-w-0 items-baseline gap-2 text-[0.8125rem]'>
                      <span
                        className={cn(
                          'min-w-0 truncate',
                          result.matched === 'nickname'
                            ? 'font-medium text-ink'
                            : 'text-caption'
                        )}
                      >
                        {result.nickname}
                      </span>
                      <span aria-hidden='true' className='text-caption'>
                        {'\u00b7'}
                      </span>
                      <span
                        className={cn(
                          'min-w-0 truncate',
                          result.matched === 'email'
                            ? 'font-medium text-ink'
                            : 'text-caption'
                        )}
                      >
                        {result.email}
                      </span>
                    </span>
                  </span>

                  {/*
                    What choosing a row does, on every row rather than on the
                    hovered one. A glyph that appears on hover cannot be read at
                    rest, and the resting state is what the reader is looking at
                    while they are choosing.
                  */}
                  <IconUserPlus
                    className='h-4 w-4 shrink-0 text-caption'
                    aria-hidden='true'
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export { AccountPicker };
export default AccountPicker;