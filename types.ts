import { DialogProps } from '@radix-ui/react-dialog';
import { ReactNode } from 'react';

export interface Gift {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  isPurchased: boolean;
  createdAt: string;
  updatedAt: string;
  groupId: string;
  forMemberId: string;
}

export interface Member {
  id: string;
  name: string;
  joinedAt: string;
}

export interface User {
  id: string;
  name: string;
  password?: string;
  createdAt: Date;
  userGroups?: UserGroup[];
}

export interface UserGroup {
  id: string;
  userId: string;
  groupId: string;
  joinedAt: Date;
  user: User;
  gifts?: Gift[];
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
  createGroup: string;
  createGroupDescription: string;
  enterGroupName: string;
  enterPassword: string;
  loginToGroup: string;
  /**
   * What the login sheet is FOR, in one sentence. It used to be `enterGroupName`
   * - the first field's own name - which put "Gruppenname" on screen three times
   * in a row: once as the sheet's description, once as the printed label over the
   * field, and once as the placeholder inside it.
   */
  loginDescription: string;
  groupName: string;
  password: string;
  confirmPassword: string;
  createGroupBtn: string;
  members: string;
  addMember: string;
  logout: string;
  noMembers: string;
  features: Features;
  landing: {
    /**
     * The one sentence under the claim on the landing page: what the group model
     * actually is, in concrete terms, rather than a second adjective about the
     * product. Written to stand at 46ch in the claim column and to survive being
     * four lines of German or Russian on a 390px phone.
     */
    standfirst: string;
  };
  preview: LandingPreviewTranslations;
  errors: {
    loginRequired: string;
    failedToLoad: string;
    failedToLoadGifts: string;
    invalidNameFormat: string;
    duplicateName: string;
    loginFailed: string;
    passwordMismatch: string;
    registrationFailed: string;
  };
  success: {
    loggedOut: string;
  };
  memberGifts: MemberGiftsTranslations;
  addMemberDialog: AddMemberDialogDictionary;
  toasts: ToastTranslations;
  confirmations: ConfirmationTranslations;
  footer: {
    copyright: string;
    privacyPolicy: string;
    termsConditions: string;
  };
  privacy: {
    title: string;
    section1: {
      title: string;
      content: string;
    };
    section2: {
      title: string;
      content: string;
    };
    section3: {
      title: string;
      content: string;
      subtitle1: string;
      content1: string;
      subtitle2: string;
      content2: string;
    };
    section4: {
      title: string;
      content: string;
    };
    section5: {
      title: string;
      content: string;
    };
    section6: {
      title: string;
      content: string;
    };
    section7: {
      title: string;
      content: string;
    };
    section8: {
      title: string;
      content: string;
    };
    section9: {
      title: string;
      content: string;
    };
    section10: {
      title: string;
      content: string;
    };
  };
  terms: {
    title: string;
    section1: {
      title: string;
      content: string;
    };
    section2: {
      title: string;
      content: string;
    };
    section3: {
      title: string;
      content: string;
    };
    section4: {
      title: string;
      content: string;
    };
    section5: {
      title: string;
      content: string;
    };
    section6: {
      title: string;
      content: string;
    };
  };
  giftCount: {
    /** A member with no gift ideas at all - the one who most needs a present. */
    none: string;
    /** Every idea on the list has been bought. */
    zero: string;
    one: string;
    many: string;
  };
  [key: string]:
    | string
    | { [key: string]: string | { [key: string]: string } }
    | AddMemberDialogDictionary
    | MemberGiftsTranslations
    | ToastTranslations
    | ConfirmationTranslations
    | LandingPreviewTranslations
    | { name: string; count: number; collected: number }[]
    | { [key: string]: string };
}

/**
 * The sample list on the landing page. It renders with the same count strings and
 * the same row anatomy as the real dashboard, so it cannot drift away from what
 * a member actually sees.
 */
export interface LandingPreviewTranslations {
  /**
   * The specimen's own title: a real group's name, set in the serif. The
   * dashboard's header shows the group's name in place of the product's, which
   * is how the product stops being a tool and becomes that group's list, and the
   * plate has to carry the same line or the quotation is missing the one thing
   * the product is actually about.
   */
  group: string;
  /**
   * The caption under the plate. It used to claim the plate was "the whole
   * screen", which was true when the plate reproduced the dashboard at full size
   * and is not true now that it is reproduced as a tipped-in plate beside the
   * claim. It now says what the reader is looking at.
   */
  lead: string;
  /**
   * `count` is how many ideas are still OPEN - which is what the lead sentence
   * promises. `collected` is how many of the same member's ideas are already
   * bought, and exists so the row's progress rule has real fill: with open counts
   * alone the rule could only ever stand at zero, which read as an empty bar
   * rather than as progress.
   *
   * Numbers, not strings, so this costs no copy in any locale.
   */
  members: { name: string; count: number; collected: number }[];
}

export interface MemberGiftsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  memberId: string;
  gifts: Gift[];
  onGiftAdded: () => void;
  dict: MemberGiftsTranslations & {
    toasts: ToastTranslations;
    confirmations: ConfirmationTranslations;
    close: string;
    /**
     * The four count strings, passed down so the sheet's own header can say what
     * is left in exactly the words the contents page uses. Two places counting
     * the same thing is how a list and its index start disagreeing.
     */
    giftCount: Translations['giftCount'];
  };
}

export type CommandDialogProps = DialogProps;

export interface AuthButtonsProps {
  dict: Translations;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  groupName?: string;
  message?: string;
}

export interface AddMemberDialogDictionary {
  addMemberTitle: string;
  addMember: string;
  adding: string;
  enterGroupName: string;
  enterMemberName: string;
}

export interface AddMemberFormProps {
  dict: AddMemberDialogDictionary;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Localized reason the server refused the name, shown against the field. */
  nameError?: string | null;
  onNameChange?: () => void;
}

export interface MemberGiftsTranslations {
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
   * add form insists on is a title, and a person staring at an empty page has no
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
   * The two printed labels that head a sheet of the album page. A sheet is
   * divided into the cells still waiting and the cells already stamped, because
   * "what is still needed" and "what is already handled" are different
   * questions and a single undifferentiated list cannot answer either.
   */
  openIdeas: string;
  collectedIdeas: string;
}

export interface ToastTranslations {
  giftAdded: string;
  giftAddFailed: string;
  giftStatusPurchased: string;
  giftStatusBackToList: string;
  giftStatusUpdateFailed: string;
  giftDeleted: string;
  giftDeleteFailed: string;
  memberAdded: string;
  memberAddFailed: string;
  loginSuccess: string;
  registrationSuccess: string;
  memberDeleted: string;
  memberDeleteFailed: string;
}

export interface ConfirmationTranslations {
  deleteGift: string;
  deleteMember: string;
}

export interface AddMemberDialogProps {
  onMemberAdded?: () => void;
  dict?: {
    addMemberDialog: AddMemberDialogDictionary;
    toasts: Pick<ToastTranslations, 'memberAdded' | 'memberAddFailed'>;
    close: string;
  };
}

export interface RootLayoutProps {
  children: ReactNode;
}

export interface HeaderProps {
  groupName?: string;
  dict?: Pick<Translations, 'logout'>;
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
  groupName: string | undefined;
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

export interface LoginFormProps {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export interface RegisterFormProps {
  dict: Translations;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  groupName?: string;
}

export interface GiftCardProps {
  gift: Gift;
  dict: Pick<
    MemberGiftsTranslations,
    'markAsPurchased' | 'markAsAvailable' | 'deleteGift'
  >;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  /** The row whose toggle request is in flight; it dims and refuses re-clicks. */
  togglingId: string | null;
  /**
   * The row that actually changed in this dialog session. The cancellation and
   * the settle are gated on it, so opening the sheet for someone with five
   * collected ideas does not replay five cancellations.
   */
  changedId: string | null;
}

/** A member row's gift counts: what is left to buy, and what the list holds. */
export interface MemberGiftCounts {
  unbought: number;
  total: number;
}

export interface MemberListProps {
  members: Member[];
  giftCounts: Record<string, MemberGiftCounts>;
  dict: any;
  onMemberClick: (id: string) => void;
  onMemberDeleted: () => void;
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

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
}

export interface DebounceOptions {
  delay: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface MemberListHeaderProps {
  dict: any;
  onDeleteClick: () => void;
  onMemberAdded: () => void;
  hasMembers: boolean;
  /**
   * Whether removal mode is on. The control is a toggle and it is the only
   * announcement of the mode's state: the row's own change is that a remove
   * control appears, which a screen reader is told about at the row and not at
   * the control that caused it.
   */
  isRemoving: boolean;
}
