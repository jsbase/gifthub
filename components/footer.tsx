import React from 'react';
import FooterLinks from '@/components/footer-links';
import { AFFILIATE_DISCLOSURES } from '@/lib/affiliate';
import { cn } from '@/lib/utils';
import type { FooterProps } from '@/types';

const Footer: React.FC<FooterProps> = ({ dict }) => {
  if (!dict) return null;

  return (
    <footer
      data-testid='footer'
      className={cn('mt-auto', 'w-full', 'border-t', 'border-rule')}
    >
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
        {AFFILIATE_DISCLOSURES.map((key) => (
          /*
            What an affiliate programme's agreement requires on the site, once per
            programme that is switched on. In the footer because that is the one
            place every page has, and on its own line under the row because the
            sentence is longer than anything beside it and is not a link: put in the
            row it would wrap the support link at 390px for the sake of a line of
            legal copy.

            Only for programmes that are on. With no ID configured this renders
            nothing, which is correct: "I earn from qualifying purchases" with no
            programme behind it would be untrue. It is shown as the agreement words
            it and nothing is added to it - what else may be said publicly about the
            programme is limited by that agreement.
          */
          <p
            key={key}
            data-testid='affiliateDisclosure'
            className={cn('mt-3', 'text-[0.8125rem]', 'text-caption')}
          >
            {dict.footer.affiliateDisclosures[key]}
          </p>
        ))}
      </div>
    </footer>
  );
};

export default Footer;
