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
  createGroup: string;
  createGroupDescription: string;
  enterGroupName: string;
  enterPassword: string;
  loginToGroup: string;
  groupName: string;
  password: string;
  confirmPassword: string;
  createGroupBtn: string;
  members: string;
  addMember: string;
  logout: string;
  noMembers: string;
  features: Features;
  errors: {
    loginRequired: string;
    failedToLoad: string;
    failedToLoadGifts: string;
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
    zero: string;
    one: string;
    many: string;
  };
  [key: string]: string | { [key: string]: string | { [key: string]: string } } | AddMemberDialogDictionary | MemberGiftsTranslations | ToastTranslations | ConfirmationTranslations | { [key: string]: string };
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
  };
}

export interface CommandDialogProps extends DialogProps {}

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
}

export interface MemberGiftsTranslations {
  title: string;
  description: string;
  manageGifts: string;
  addGift: string;
  giftTitle: string;
  enterGiftTitle: string;
  optional: string;
  enterDescription: string;
  enterUrl: string;
  cancel: string;
  adding: string;
  noGifts: string;
  markAsPurchased: string;
  markAsAvailable: string;
  deleteGift?: string;
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

export interface PageProps {
  params: Promise<{ lang: string }>,
}

export interface FeatureCardProps {
  title: string;
  description: string;
}

export interface FooterProps {
  dict: Translations;
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

export interface GiftCardProps {
  gift: Gift;
  dict: Pick<MemberGiftsTranslations, 'markAsPurchased' | 'markAsAvailable'>;
  onDelete: (id: string) => void;
  onTogglePurchased: (id: string) => void;
  animatedGiftId: string | null;
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

export interface MemberListProps {
  members: Member[];
  giftCounts: Record<string, number>;
  dict: any;
  onMemberClick: (id: string) => void;
  onMemberDeleted: () => void;
}
