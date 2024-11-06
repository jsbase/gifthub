import { type DialogProps } from '@radix-ui/react-dialog';

export interface Gift {
  id: string;
  title: string;
  description?: string;
  url?: string;
  isPurchased: boolean;
  createdAt: string;
}

export interface Member {
  id: string;
  email: string;
  joinedAt: string;
}

export interface User {
  id: string;
  email: string;
}

export interface UserGroup {
  id: string;
  joinedAt: Date;
  user: User;
}

export interface Translations {
  tagline: string;
  login: string;
  register: string;
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
  joined: string;
  features: {
    simple: {
      title: string;
      description: string;
    };
    tracking: {
      title: string;
      description: string;
    };
    updates: {
      title: string;
      description: string;
    };
  };
  errors: {
    loginRequired: string;
    failedToLoad: string;
    failedToLoadGifts: string;
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
  [key: string]: string | { [key: string]: string | { [key: string]: string } } | AddMemberDialogDictionary | MemberGiftsTranslations | ToastTranslations | ConfirmationTranslations | { [key: string]: string };
}

export interface MemberGiftsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memberEmail: string;
  memberId: string;
  gifts: Gift[];
  onGiftAdded: () => void;
  dict: MemberGiftsTranslations & {
    toasts: ToastTranslations;
    confirmations: ConfirmationTranslations;
  };
}

export interface CommandDialogProps extends DialogProps { }

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AddMemberDialogDictionary {
  addMember: string;
  addMemberTitle: string;
  enterGroupName: string;
  emailAddress: string;
  enterMemberEmail: string;
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
}

export interface ToastTranslations {
  giftAdded: string;
  giftAddFailed: string;
  giftStatusUpdated: string;
  giftStatusUpdateFailed: string;
  giftDeleted: string;
  giftDeleteFailed: string;
}

export interface ConfirmationTranslations {
  deleteGift: string;
}

export interface AddMemberDialogProps {
  onMemberAdded?: () => void;
  dict: Translations['addMemberDialog'];
}

export interface HeaderProps {
  groupName?: string;
  dict?: Pick<Translations, 'logout'>;
  onLogout?: () => void;
  showAuth?: boolean;
}

export interface HomeProps {
  params: Promise<{ lang: string }>,
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export interface FeatureCardProps {
  title: string;
  description: string;
}

export interface FooterProps {
  dict: Translations;
}

export interface PrivacyPageProps {
  params: Promise<{ lang: string }>
}

export interface TermsPageProps {
  params: Promise<{ lang: string }>
}

export interface AuthState {
  isAuthenticated: boolean;
  groupName: string | undefined;
}

export type LanguageCode = 'en' | 'de' | 'ru';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export interface AuthVerifyResponse {
  success: boolean;
  groupName?: string;
  message?: string;
}
