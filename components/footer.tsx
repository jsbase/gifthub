import React from 'react';
import FooterLinks from '@/components/footer-links';
import { cn } from '@/lib/utils';
import type { FooterProps } from '@/types';

const Footer: React.FC<FooterProps> = ({ dict }) => {
  if (!dict) return null;

  return (
    <footer className={cn('bg-white', 'dark:bg-gray-800', 'mt-auto', 'w-full')}>
      <div className={cn('container', 'mx-auto', 'p-4', 'py-6', 'lg:py-8')}>
        <div className={cn('sm:flex', 'sm:items-center', 'sm:justify-between')}>
          <p
            className={cn(
              'mb-1',
              'lg:mb-0',
              'text-xs',
              'lg:text-sm',
              'text-right',
              'sm:text-left',
              'text-gray-500',
              'dark:text-gray-400'
            )}
          >
            {dict.footer.copyright}
          </p>
          <FooterLinks dict={dict} />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
