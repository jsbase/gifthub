import { memo } from 'react';
import Link from "next/link";
import { cn } from '@/lib/utils';
import { FooterProps } from "@/types";

const FooterLinks = function FooterLinks({
  dict
}: Pick<FooterProps, 'dict'>) {
  return (
    <div className={cn(
      "flex",
      "space-x-5",
      "justify-end",
      "sm:justify-center"
    )}>
      <Link
        href="/privacy"
        className={cn(
          "text-gray-500",
          "hover:text-gray-900",
          "dark:hover:text-white"
        )}
      >
        {dict.footer.privacyPolicy}
      </Link>
      <Link
        href="/terms"
        className={cn(
          "text-gray-500",
          "hover:text-gray-900",
          "dark:hover:text-white"
        )}
      >
        {dict.footer.termsConditions}
      </Link>
    </div>
  );
};

export default memo(FooterLinks);