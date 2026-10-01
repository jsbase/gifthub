import React from 'react';
import FooterLinks from '@/components/footer-links';
import { cn } from '@/lib/utils';
import type { FooterProps } from '@/types';

const Footer: React.FC<FooterProps> = ({ dict }) => {
  if (!dict) return null;

  return (
    <footer className={cn('mt-auto', 'w-full', 'border-t', 'border-rule')}>
      <div className={cn('container', 'mx-auto', 'py-6')}>
        <div
          className={cn(
            'flex',
            'flex-col',
            'gap-2',
            'sm:flex-row',
            'sm:items-center',
            'sm:justify-between'
          )}
        >
          <p className={cn('text-[0.8125rem]', 'text-caption')}>
            {dict.footer.copyright}
          </p>
          <FooterLinks dict={dict} />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
