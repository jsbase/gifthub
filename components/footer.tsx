import { cn } from '@/lib/utils';
import { FooterProps } from "@/types";
import Link from "next/link";

export function Footer({ dict }: FooterProps) {
  return (
    <footer className={cn(
      "bg-white",
      "dark:bg-gray-800"
    )}>
      <div className={cn(
        "container",
        "mx-auto",
        "p-4",
        "py-6",
        "lg:py-8"
      )}>
        <div className={cn(
          "sm:flex",
          "sm:items-center",
          "sm:justify-between"
        )}>
          <p className={cn(
            "mb-1",
            "lg:mb-0",
            "text-xs",
            "lg:text-sm",
            "text-right",
            "sm:text-left",
            "text-gray-500",
            "dark:text-gray-400"
          )}>
            {dict.footer.copyright}
          </p>
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
        </div>
      </div>
    </footer>
  );
}
