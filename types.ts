import { ReactNode } from 'react';

/**
 * One idea on one list.
 *
 * Note what is missing: `purchasedById`. The database stores it, and the server
 * reads it to decide who is allowed to clear a mark, but it is not part of this
 * type - so no endpoint can hand it to the client without the type changing and
 * the change being noticed. The buyer's identity is not a product output, and the
 * cheapest way to keep it that way is for it not to exist on the way out.
 */
export interface Gift {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
  listId: string;
  /**
   * Whether this reader may take the mark back off this idea.
   *
   * Per idea, and computed by the server, which is the only place that can know it:
   * it follows from `purchasedById`, and `purchasedById` is not on this type and
   * must never be. An owner may clear a mark they set and is refused one somebody
   * else set; a buyer may clear any. A client trying to derive this from
   * `isPurchased` alone can only reach "an owner may not clear any mark", which
   * forbids undoing "I already bought this myself" while the server would allow it.
   *
   * It answers *may I*, not *who did*, so it discloses no name and no id.
   */
  canClear: boolean;
}

/**
 * How far a list reaches. Mirrors the `ListVisibility` enum in the Prisma schema.
 *
 * `SHARED` means "the accounts named in this list's access list, and nobody else".
 * It is not public, not discoverable, and not reachable by link.
 */
export type ListVisibility = 'PRIVATE' | 'SHARED';

/**
 * One person who may read one list.
 *
 * `accountId` is `null` only if the account was deleted while holding access;
 * `email` is stored so the row stays nameable in that case.
 */
export interface ListAccess {
  id: string;
  accountId: string | null;
  email: string;
  displayName: string;
  grantedAt: string;
}

/**
 * A list as the contents page and the share dialog both need to describe it.
 *
 * One type rather than one for an owned list and one for a shared list: the two
 * differ in which controls the row offers, and that is a boolean, not a different
 * shape. Two parallel interfaces were the earlier model's mistake - the member
 * list and the shared-lists view had drifted because each had its own.
 */
export interface ListSummary {
  id: string;
  name: string;
  visibility: ListVisibility;
  /** The owner's name. Carried on a shared list because that is what identifies it. */
  ownerId: string;
  ownerDisplayName: string;
  giftCounts: MemberGiftCounts;
  /** How many people the list is shared with. Zero on a private list. */
  sharedWithCount: number;
  /** Whether the signed-in account owns this list, which decides every affordance. */
  isOwner: boolean;
  createdAt: string;
}

export interface Features {
  [key: string]: {
    title: string;
    description: string;
  };
}

export interface Translations {
  tagline: string;
  login: string;
  register: string;
  loading: string;
  cancel: string;
  close: string;

  /** The three registration fields, and the two on the sign-in sheet. */
  email: string;
  displayName: string;
  /**
   * The unique handle, chosen once at registration and used to sign in.
   *
   * Distinct from `displayName` on purpose, and the distinction is the whole reason
   * it exists: display names are not unique - two accounts are both called Anna - so
   * a display name cannot identify anybody. See `lib/nickname.ts`.
   */
  nickname: string;
  password: string;
  confirmPassword: string;
  /**
   * The sign-in field's printed label.
   *
   * It is not "email", because the field accepts a nickname too - and a label that
   * names only one of the two things the field takes is a label that is wrong for
   * half the people who use it.
   */
  loginIdentifier: string;
  /**
   * What the nickname is for, on the registration sheet.
   *
   * Its own key rather than a shared one with the sign-in sheet, because the two
   * sheets answer different questions. Signing in: "this is what you chose".
   * Registering: "this is what other people will see you as, for now" - because the
   * display name is derived from this value rather than asked for, and sharing one
   * sentence between the two told a first-time user they could change a display
   * name they had not been given. (The sign-in sheet now says its half of this in
   * `loginDescription` rather than under the field.)
   */
  registerNicknameHint: string;
  loginBtn: string;
  registerBtn: string;

  /**
   * What the sign-in sheet is FOR, plus what the nickname is. It was
   * `enterGroupName` - the first field's own name - which put "Gruppenname" on
   * screen three times in a row: as the sheet's description, as the printed label
   * over the field, and as the placeholder inside it.
   *
   * The nickname sentence lives here rather than under the field because of *when*
   * it is read rather than about the room it took: a dialog description is announced
   * with the title when the sheet opens, and a person asks whether a nickname has to
   * be their real name exactly once, on the way in - where a line printed for the
   * whole interaction answers it again on every later glance. The
   * `aria-describedby` on that field did not go with the sentence; it now names the
   * error the reader earned, because a description that is a constant describes
   * nothing about what was typed.
   */
  loginDescription: string;
  registerDescription: string;

  logout: string;
  changeLanguage: string;

  /** The two halves of the contents page. */
  yourLists: string;
  sharedWithYou: string;
  createList: string;
  createListDescription: string;
  deleteList: string;
  /**
   * The title of the delete-list confirmation, above the sentence that warns about
   * the cascade. It was in all three locale files and in no type while the member
   * equivalent existed - both were reachable only through `dict: any`.
   */
  removeListConfirm: string;
  noLists: string;
  noSharedLists: string;

  features: Features;
  landing: {
    /**
     * The one sentence under the claim on the landing page: what the reader gets,
     * said plainly, rather than a second adjective about the product. Written to
     * hold its own measure at `max-w-[52ch]` and to survive a 390px phone, where
     * the German and the Russian are the longest of the three.
     */
    standfirst: string;
  };
  preview: LandingPreviewTranslations;
  errors: ErrorTranslations;
  success: SuccessTranslations;
  toasts: ToastTranslations;
  confirmations: ConfirmationTranslations;
  visibility: VisibilityTranslations;
  listSheet: ListSheetTranslations;
  shareList: ShareListDictionary;
  createListDialog: CreateListDialogDictionary;
  listBoard: ListBoardDictionary;
  footer: {
    copyright: string;
    privacyPolicy: string;
    termsConditions: string;
  };
  privacy: PrivacyTranslations;
  terms: TermsTranslations;
  giftCount: {
    /** A list with no gift ideas at all - the one that most needs a present. */
    none: string;
    /** Every idea on the list has been bought. */
    zero: string;
    one: string;
    many: string;
  };
  /*
    There is deliberately no index signature here.

    One used to sit at the bottom of this interface, admitting `string` and a
    handful of object shapes for any key at all. It checked every key that is
    named above and waved through every key that is not, which is what let two
    props describing the same visual concept be typed three different ways - two
    of them `any` - and what let a key exist in `de.json` and be missing from
    `ru.json` without anything noticing.

    A string is only in the product once it exists in de, en and ru. Removing the
    escape hatch is what makes that true by construction rather than by review.
  */
}

/**
 * Every refusal the server can hand back, as a key the client turns into a
 * sentence in the user's language.
 *
 * These are grouped because the grouping is the point: a client that receives
 * `cannot_clear_purchase` and one that receives `forbidden` need different words,
 * and the difference between "you may not do that" and "that is not yours to see"
 * is exactly the distinction `PRODUCT.md:89` calls a product concern.
 */
export interface ErrorTranslations {
  loginRequired: string;
  failedToLoad: string;
  failedToLoadGifts: string;
  /**
   * A sign-in attempt that was refused, and the reason it is one sentence rather
   * than two.
   *
   * The route answers "no such account" and "wrong password" with the same 401,
   * both statuses and both in constant time, so that the sign-in cannot be used to
   * find out who is registered - see the long comment in
   * `app/api/auth/login/route.ts`. This sentence therefore names both possibilities
   * and chooses neither, which is the only sentence that is true in either case.
   * Printing one of them would confirm, to somebody typing an address that is not
   * theirs, exactly what they guessed.
   */
  loginRejected: string;
  /**
   * The sign-in never left the device, or came back as something other than JSON.
   *
   * Separate from `loginRejected` because it is a different problem with a different
   * answer: retrying works, and no amount of retyping does. It says nothing about
   * whether the account exists, because nothing was ever asked about that.
   */
  loginOffline: string;
  /**
   * The server answered, and the answer was a 5xx.
   *
   * Deliberately says "that did not work" rather than naming a cause: the route's
   * own catch-all logs the real error and returns a fixed message, so a sentence
   * that guessed at it would be inventing information. "Try again later" is the
   * honest instruction, and it is what a person can act on.
   */
  loginServerError: string;
  /**
   * The quiet way out of the sign-in sheet for somebody who has no account.
   *
   * A question and its action in one control, which is why the sentence is short
   * enough to read as a link rather than as a heading.
   *
   * Which failures offer it is a security decision, and it is drawn on the status
   * rather than on the refusal code: `invalid_identifier` is in the closed union too,
   * so a rule phrased over the union would make every refusal added to it inherit
   * this offer. What makes it safe to show is that it skips no refusal which could
   * mean "you may not have an account": it is offered on a 401, both of its causes
   * alike, and on a status this build cannot read, so its presence can say nothing at
   * all about whether the reader is registered. `auth-buttons.tsx` is where the line
   * is drawn.
   */
  createAccountInstead: string;
  passwordMismatch: string;
  registrationFailed: string;

  /** Credential-shaped refusals, shown against the field that caused them. */
  invalidEmail: string;
  duplicateEmail: string;
  weakPassword: string;
  invalidDisplayName: string;
  /**
   * What the sign-in field says when it holds neither a usable nickname nor a
   * usable address. It cannot reuse `invalidEmail`, which tells a person their
   * address is malformed - the wrong sentence entirely when they typed a handle.
   */
  invalidIdentifier: string;
  /**
   * `PATCH /api/lists/{id}` refusals, for a body that named neither field, both
   * fields, or a visibility that is not one of the two.
   *
   * They were bare strings outside the closed union when both review axes found
   * them, which meant `isRefusal` rejected them and no client could ever have a
   * sentence for them. They are in the vocabulary now, which is what §7.1 means by
   * the status mapping living in one place.
   */
  nothingToChange: string;
  ambiguousChange: string;
  invalidVisibility: string;
  /** Nickname refusals, shown against the nickname field. */
  invalidNickname: string;
  duplicateNickname: string;

  /** Sharing refusals, shown inside the share dialog. */
  noSuchAccount: string;
  alreadyShared: string;
  cannotShareWithOwner: string;
  notSharedYet: string;
  cannotClearPurchase: string;
  forbidden: string;
  notFound: string;
}

export interface SuccessTranslations {
  loggedOut: string;
}

/**
 * The one plate the landing page draws: one real list, in one state.
 *
 * It is a flat object again, and that is a decision rather than a leftover. It has
 * been a list twice. First three sample lists under one plate title, which made
 * the plate a specimen of the software rather than a page of somebody's, and put
 * the only interesting count - the zero - in one row of three. Then one list drawn
 * three times, its open count falling 3 -> 1 -> 0 and its figure becoming a check
 * in the last one. That version was built, rendered, looked at and rejected:
 * three plates carrying the same head, the same list name and the same single row
 * read as repetition rather than as a story, the plate in the hero's right column
 * and the pair below broke one asymmetric spread into three scattered rectangles,
 * and the plate with the check read as a *different* list rather than as a later
 * state of this one. Nothing about the plate was wrong. Three of them were, and the
 * number 3 was carrying the argument the plate should have carried.
 *
 * So: one plate, one state, and nothing to enumerate. An array here would be
 * nothing but standing room for a second plate, which is exactly the shape the
 * next reader of this file will be tempted to fill. `tests/landing.spec.ts` counts
 * the plates on the page and forces the number to be one, which is the cheapest
 * place that invitation gets refused.
 */
export interface LandingPreviewTranslations {
  /**
   * What happened to this list, in the reader's own person.
   *
   * Naming nobody who bought is not a copy rule, it is the product: no buyer is
   * ever named anywhere, and a sentence that attributed a purchase would assert
   * something the app deliberately refuses to deliver. This one does name the
   * people the list was shared with - those are the reader's own choices, and
   * they are what makes the plate a shared list at all.
   */
  action: string;
  /**
   * `count` is how many ideas are still OPEN - the number the row's count words
   * say out loud. `collected` is how many of the same list's ideas are already
   * bought, and exists so the row's progress rule has real fill: with open counts
   * alone the rule could only ever stand at zero, which read as an empty bar
   * rather than as progress.
   *
   * An array because the plate is a specimen of a contents page, and a contents
   * page is a list of things. It holds one row today, at 3 open and 2 bought,
   * because a list somebody can still be surprised by is the honest opening and a
   * list with nothing left to buy is not. `SheetProgress` replaces the figure with
   * a check at `count: 0`; the page does not stand there, which is the choice and
   * not an oversight.
   *
   * Numbers, not strings, so this costs no copy in any locale.
   */
  items: { name: string; count: number; collected: number }[];
}

/**
 * The two visibility values, and the sentence that explains each.
 *
 * The hints exist because the labels alone do not say what happens. "Private" and
 * "Shared" describe a state; the hint states the consequence, which is the part
 * that matters before anyone presses the control.
 */
export interface VisibilityTranslations {
  private: string;
  shared: string;
  privateHint: string;
  sharedHint: string;
  /** The label on the control that changes it. */
  change: string;
  /** Section heading on a list that is shared with somebody. */
  sharedWith: string;
  /** Section heading on a list that is shared with nobody yet. */
  sharedWithNobody: string;
}

export interface ListSheetTranslations {
  listHint: string;
  addGift: string;
  enterGiftTitle: string;
  optional: string;
  enterDescription: string;
  enterUrl: string;
  cancel: string;
  adding: string;
  noGifts: string;
  /**
   * What actually goes in a cell, so a blank one can say it. The only thing the
   * add form insists on is a title, and a person staring at an empty sheet has no
   * way of knowing that - "notiz und link are optional" is the sentence that turns
   * a blank cell from a wall into one field.
   */
  emptyCellHint: string;
  markAsPurchased: string;
  markAsAvailable: string;
  deleteGift: string;
  /** Title of the delete-confirmation dialog; the button reuses deleteGift. */
  deleteGiftConfirm: string;
  /**
   * The two printed labels that head a sheet. A sheet is divided into the cells
   * still waiting and the cells already stamped, because "what is still needed" and
   * "what is already handled" are different questions and a single undifferentiated
   * list cannot answer either.
   */
  openIdeas: string;
  collectedIdeas: string;
  /**
   * Shown to somebody reading a list that is not theirs, above the sheet. It says
   * the one thing they can do that the owner cannot do for them, because otherwise
   * a buyer has to guess whether the controls are missing or broken.
   */
  youAreABuyer: string;
  /**
   * Shown on a mark the reader may not clear - which is the owner's view of a mark
   * somebody else set. It is a refusal stated as a fact rather than as an error,
   * because it is not a failure: the mark is correct and permanent.
   */
  markedBySomeoneElse: string;
  backToLists: string;
}

export interface ToastTranslations {
  giftAdded: string;
  giftAddFailed: string;
  giftStatusPurchased: string;
  giftStatusBackToList: string;
  giftStatusUpdateFailed: string;
  giftDeleted: string;
  giftDeleteFailed: string;
  listCreated: string;
  listCreateFailed: string;
  listRenamed: string;
  listRenameFailed: string;
  listDeleted: string;
  listDeleteFailed: string;
  visibilityChanged: string;
  visibilityChangeFailed: string;
  accessGranted: string;
  accessGrantFailed: string;
  accessRevoked: string;
  accessRevokeFailed: string;
  loginSuccess: string;
  registrationSuccess: string;
}

export interface ConfirmationTranslations {
  deleteGift: string;
  deleteList: string;
}

export interface CreateListDialogDictionary {
  createListTitle: string;
  enterListName: string;
  create: string;
  creating: string;
  /** The two choices, and the sentence under each. */
  visibilityLegend: string;
  private: string;
  privateHint: string;
  shared: string;
  sharedHint: string;
}

export interface ShareListDictionary {
  shareTitle: string;
  /**
   * The one-sentence explanation of what sharing does. It is the load-bearing
   * string in this dialog: the field below it takes an email address and grants
   * that person the whole list, and nothing else on screen says so.
   */
  shareLead: string;
  enterEmail: string;
  add: string;
  adding: string;
  revoke: string;
  revokeConfirmTitle: string;
  /** Shown when nobody has been added to a shared list yet. */
  nobodyYet: string;
  /**
   * On a private list, the whole dialog is replaced by this: the list has to be
   * shared before it can be shared with somebody, and saying so is clearer than a
   * disabled field with no explanation.
   */
  privateFirst: string;
  makeShared: string;
}

export interface ListBoardDictionary {
  /** The two section headings, repeated for the sheet's own back link. */
  yourLists: string;
  sharedWithYou: string;
  createList: string;
  addGift: string;
  rename: string;
  renameTitle: string;
  renameLabel: string;
  save: string;
  saving: string;
  deleteList: string;
  changeVisibility: string;
  share: string;
  /** The trailing sentence on a shared row: who else can see it. */
  sharedWithCount: string;
  noLists: string;
  noSharedLists: string;
  private: string;
  shared: string;
}

/*
  The privacy policy and the terms are long, sectioned prose that changes only
  when the product's data handling changes - which this refactor does, and
  significantly. They are modelled structurally rather than as numbered keys for
  two reasons: the sections are edited as documents, and a flat list of
  `section1Title`, `section2Title` … makes adding a section in the middle a
  renumbering of everything after it.
*/
export interface DocumentSection {
  title: string;
  content: string;
}

export interface PrivacyTranslations {
  title: string;
  sections: DocumentSection[];
  /**
   * Sub-sections, where a section has them. Empty for the sections that do not.
   * `PRODUCT.md:67` records that the operator details in section 2 are still
   * unfilled placeholders in a publicly deployed app - a known legal gap, kept
   * visible here rather than quietly carried along.
   */
  subsections?: { title: string; content: string }[];
}

export interface TermsTranslations {
  title: string;
  sections: DocumentSection[];
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ListBoardProps {
  lists: ListSummary[];
  shared: ListSummary[];
  dict: Translations;
  onOpenList: (listId: string) => void;
  onCreateList: () => void;
  onShareList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onListChanged: () => void;
}

export interface ListRowProps {
  list: ListSummary;
  dict: Translations;
  onOpen: (listId: string) => void;
  onShare?: (listId: string) => void;
  onRename?: (listId: string) => void;
  onChangeVisibility?: (listId: string) => void;
  onDelete?: (listId: string) => void;
  /**
   * The row whose rename or visibility request is in flight. It dims and refuses
   * re-clicks, so a double submit cannot fire two mutations at one row.
   */
  busyId?: string | null;
}

export interface ListSheetProps {
  list: ListSummary;
  gifts: Gift[];
  access: ListAccess[];
  isOwner: boolean;
  dict: Translations;
  onClose: () => void;
  onGiftAdded: () => void;
  onGiftChanged: () => void;
  onGiftDeleted: () => void;
  onDeleteList: () => void;
  onShareList: () => void;
  onVisibilityChanged: () => void;
}

/**
 * `/{lang}/list/[id]`.
 *
 * Separate from `PageProps` because that one carries only `lang`, and a page whose
 * props type does not mention `id` would resolve to the global `PageProps` Next 16
 * generates into `.next/types/routes.d.ts` - which is parameterised by route. That
 * shadowing is deliberate and is why `PageProps` is declared by hand at all; adding
 * `id` to it would make the dashboard claim a parameter it does not have.
 */
export interface ListPageProps {
  params: Promise<{ lang: string; id: string }>;
}

export interface CreateListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dict: Translations;
  onCreated: (listId: string) => void;
}

/**
 * The board or the sheet, wrapped in the same furniture.
 *
 * Shared by `/[lang]/dashboard` and `/[lang]/list/[id]`, and it is a prop interface
 * here rather than inline at the component for the repo's reason - one type surface,
 * and the second caller's signature visible next to the first's.
 */
export interface SheetFrameProps {
  header: HeaderProps;
  dict: Translations;
  children: ReactNode;
}

/**
 * The two-state chooser for a list's reach.
 *
 * Reports a *choice*, never a mutation: the contents page dims its row while the
 * PATCH is in flight and the sheet reports afterwards, so this dialog decides what a
 * reader is choosing between and nothing about what happens next - it closes, and
 * the caller decides when the world changes.
 */
export interface ListVisibilityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: ListVisibility;
  /** The two states, both labels and both hints, plus the dialog's close label. */
  dict: Pick<Translations, 'visibility' | 'close'>;
  onSelect: (visibility: ListVisibility) => void;
  isPending?: boolean;
}

export interface ShareListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  visibility: ListVisibility;
  access: ListAccess[];
  dict: Translations;
  onChanged: () => void;
  /** Called after the list is switched to shared from inside the dialog. */
  onVisibilityChanged: () => void;
}

/**
 * A list row's gift counts: what is left to buy, and what the list holds.
 *
 * Keeps its old name deliberately. It describes a sheet of ideas, and both a
 * member's sheet and a list's sheet were the same thing; renaming it would have
 * been churn and would have hidden that nothing about the count changed.
 */
export interface MemberGiftCounts {
  unbought: number;
  total: number;
}

export interface AuthButtonsProps {
  dict: Translations;
}

/**
 * The one plate of the landing page: the reader's own contents page.
 *
 * The whole `preview` dictionary, rather than one state out of it. While the page
 * drew three states this took a single one of them, because choosing which a plate
 * showed was the page's business - the hero owned the first and the pair below
 * owned the rest. That split is the storyboard's shape, not the plate's, and it is
 * gone; a component handed the dictionary renders all of it and needs to know
 * nothing about how the page is laid out.
 *
 * `testId` and `actionTestId` are separate because the plate and the line of prose
 * under it are separate things, and a spec that has to assert "this count, and
 * this sentence" addresses them at two different places. They are unnumbered: the
 * numbers were only ever there because there was more than one plate.
 */
export interface LandingPreviewProps {
  preview: LandingPreviewTranslations;
  /**
   * The contents page's own section head, which the specimen prints as a label and
   * not as a heading - this page has no section for a head to open.
   */
  yourLists: string;
  giftCount: Translations['giftCount'];
  testId: string;
  actionTestId: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  /**
   * The machine-readable half of a refusal, when the route answers with one.
   *
   * Deliberately `string` and not the `Refusal` union from `lib/refusals.ts`: this is
   * the one type in the file that crosses the server boundary, so it cannot narrow
   * for the reader. The client narrows it with `isRefusal`, which is a comparison
   * against literals and therefore cannot be walked into `Object.prototype` by a
   * crafted body. Typing it as the union here would claim a guarantee the wire does
   * not make, since `code` is attacker-reachable JSON.
   */
  code?: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  email?: string;
  displayName?: string;
  message?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

export interface RootLayoutProps {
  children: ReactNode;
}

export interface HeaderProps {
  /**
   * The signed-in person's display name, shown in place of the wordmark
   * (`PRODUCT.md:72`). Absent when nobody is signed in.
   */
  displayName?: string;
  dict?: Pick<Translations, 'logout' | 'changeLanguage'>;
  onLogout?: () => void;
  showAuth?: boolean;
}

// Deliberately shadows the global PageProps that Next 16 generates into
// .next/types/routes.d.ts: a page that omits `import type { PageProps }` will
// resolve to that generated global instead, which is parameterised by route.
export interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * One claim set as one line of an index. There is no register to choose: the
 * claims are entries of equal weight, and a lead set above them would read as a
 * headline of its own rather than as one of three.
 */
export interface FeatureCardProps {
  title: string;
  description: string;
}

export interface FooterProps {
  dict: Translations;
}

export interface AuthDialogProps {
  children: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  closeLabel: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  displayName: string | undefined;
}

export type LanguageCode = 'de' | 'en' | 'ru';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export type Languages = {
  [key in LanguageCode]: {
    code: LanguageCode;
    name: string;
    flag: string;
  };
};

export interface LanguageFlagProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export interface LanguageSwitcherProps {
  /**
   * The localised name for the control's action ("Change language"). The current
   * language is appended to it by the switcher, because a trigger labelled only
   * with the language it is showing is ambiguous: it reads equally as the current
   * state and as the thing you press to change it.
   */
  label?: string;
}

export interface LoginFormProps {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /**
   * The single sign-in field: a nickname or an email address.
   *
   * Named for what it accepts rather than for one of the two. `email` would be a
   * lie for half the people who use it, and the label and the id are the two places
   * that lie is most expensive.
   */
  identifierError?: string | null;
  passwordError?: string | null;
  /**
   * Opens the registration sheet, offered next to a refused sign-in as the way out
   * for somebody who has no account.
   *
   * Optional, and its *absence* is what hides the control: the caller hands over a
   * handler only in the failures where "you may not have an account yet" is a
   * useful thing to say, and hands over nothing in the ones where it would not be -
   * a server that is broken or a request that never left is not improved by an offer
   * to register. Comparing the rendered sentence against `passwordError` to work
   * that out would be a comparison of two localized strings, which is a test of the
   * translator rather than of the state.
   */
  onCreateAccount?: () => void;
}

export interface RegisterFormProps {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  emailError?: string | null;
  passwordError?: string | null;
  nicknameError?: string | null;
  /**
   * `weak_password` and a confirmation mismatch share the password slot, because
   * they are both about the password and a person fixing one has not been asked to
   * look somewhere else.
   */
  confirmPasswordError?: string | null;
  onEmailChange?: () => void;
  onPasswordChange?: () => void;
  onConfirmPasswordChange?: () => void;
  onNicknameChange?: () => void;
}

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  displayName?: string;
}

export interface GiftCardProps {
  gift: Gift;
  dict: Pick<
    ListSheetTranslations,
    'markAsPurchased' | 'markAsAvailable' | 'deleteGift'
  >;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  /** The row whose toggle request is in flight; it dims and refuses re-clicks. */
  togglingId: string | null;
  /**
   * The row that actually changed in this sheet session. The cancellation and the
   * settle are gated on it, so opening the sheet with five collected ideas does not
   * replay five cancellations.
   */
  changedId: string | null;
  /**
   * Whether this reader may delete an idea. False on a list shared with somebody
   * else, where the add form is absent too - the whole owner-only surface is gone
   * rather than disabled, because a disabled control is an invitation to ask why.
   */
  canDelete: boolean;
}

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
}

export interface DebounceOptions {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}