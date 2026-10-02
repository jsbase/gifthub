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
  password: string;
  confirmPassword: string;
  loginBtn: string;
  registerBtn: string;

  /**
   * What the sign-in sheet is FOR, in one sentence. It was `enterGroupName` - the
   * first field's own name - which put "Gruppenname" on screen three times in a
   * row: as the sheet's description, as the printed label over the field, and as
   * the placeholder inside it.
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
     * The one sentence under the claim on the landing page: what the product
     * actually is, in concrete terms, rather than a second adjective about it.
     * Written to stand at 46ch in the claim column and to survive being four lines
     * of German or Russian on a 390px phone.
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
  loginFailed: string;
  passwordMismatch: string;
  registrationFailed: string;

  /** Credential-shaped refusals, shown against the field that caused them. */
  invalidEmail: string;
  duplicateEmail: string;
  weakPassword: string;
  invalidDisplayName: string;

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
 * The sample lists on the landing page. It renders with the same count strings and
 * the same row anatomy as the real contents page, so it cannot drift away from
 * what a person actually sees.
 */
export interface LandingPreviewTranslations {
  /**
   * The specimen's own title: a real list name, set in the serif. The dashboard's
   * header shows the signed-in person's name in place of the product's, which is
   * how the product stops being a tool and becomes that person's list, and the
   * plate has to carry the same line or the quotation is missing the one thing the
   * product is actually about.
   */
  list: string;
  /**
   * The caption under the plate. It says what the reader is looking at.
   */
  lead: string;
  /**
   * `count` is how many ideas are still OPEN - which is what the lead sentence
   * promises. `collected` is how many of the same list's ideas are already bought,
   * and exists so the row's progress rule has real fill: with open counts alone the
   * rule could only ever stand at zero, which read as an empty bar rather than as
   * progress.
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

export interface FeatureCardProps {
  title: string;
  description: string;
  /**
   * `lead` is the product's own claim, set large on the landing page; `entry` is
   * a mechanism, set as a line of a catalogue index beneath it. The default is
   * `entry` so a caller that does not care gets the quiet one.
   */
  variant?: 'lead' | 'entry';
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
  /** Localized reason the server refused a field, shown against that field. */
  emailError?: string | null;
  passwordError?: string | null;
}

export interface RegisterFormProps {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  emailError?: string | null;
  passwordError?: string | null;
  displayNameError?: string | null;
  onEmailChange?: () => void;
  onPasswordChange?: () => void;
  onDisplayNameChange?: () => void;
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
  /**
   * Whether this reader may add an idea. Owners always can; a buyer never can, and
   * the add form is not rendered at all rather than rendered inert.
   */
  canAdd: boolean;
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