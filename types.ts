import { type DialogProps } from '@radix-ui/react-dialog';

export interface Gift {
  id: string;
  title: string;
  description?: string;
  url?: string;
  isPurchased: boolean;
}

export interface Member {
  id: string;
  email: string;
  joinedAt: string;
}

export interface Gift {
  id: string;
  title: string;
  description?: string;
  url?: string;
  isPurchased: boolean;
  createdAt: string;
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

export interface AddMemberDialogProps {
  onMemberAdded?: () => void;
}

export interface MemberGiftsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memberEmail: string;
  memberId: string;
  gifts: Gift[];
  onGiftAdded: () => void;
}

export interface CommandDialogProps extends DialogProps {}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}
