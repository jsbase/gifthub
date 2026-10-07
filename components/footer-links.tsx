'use client';

import { memo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getCurrentLanguage } from '@/lib/i18n-config';
import { cn } from '@/lib/utils';
import type { FooterProps } from '@/types';

const linkClasses = cn(
  'text-[0.8125rem]',
  'text-caption',
  'underline-offset-4',
  'transition-colors',
  /*
    A 44px target around 20px of text, by padding out and pulling back by the same
    amount. The privacy and terms links were the only two controls in the app that
    measured under the floor - 82x19.5px and 27x19.5px at every width, because a
    footer link is a line of text and the line is what got sized; the support link
    shares this class so it starts at the floor. On one row the footer's own height
    does not move: `-my-3` takes back exactly what `py-3` adds, so the band the
    footer occupies is unchanged and only the touch target grows. When the links
    wrap, `rowClasses` spaces the rows.
  */
  'inline-flex min-h-11 items-center',
  '-my-3',
  '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink',
  '[@media(hover:hover)_and_(pointer:fine)]:hover:underline'
);

/*
  The page the README names for covering the hosting and database costs. It is
  voluntary: it unlocks nothing and nobody is treated differently for using it
  (`PRODUCT.md`). It lives here rather than in the dictionaries because an address
  is not copy, and a translator should not be able to point one locale somewhere
  else.
*/
const SUPPORT_URL = 'https://ko-fi.com/wishyapp';

const rowClasses = cn(
  'flex',
  'flex-wrap',
  'gap-x-5',
  /*
    Only matters when the links wrap, and what it has to do then follows from
    `linkClasses`: each link's 44px box is pulled back by `-my-3`, so a row is 20px
    tall and two rows are 20px plus this gap apart. 44px apart is the least that
    keeps one row's targets off the next row's. It was `gap-y-1` while two links
    never wrapped; the support link made Russian wrap at 390px, and rows 24px apart
    laid their targets 20px over each other.
  */
  'gap-y-6'
);

const FooterLinks = ({ dict }: Pick<FooterProps, 'dict'>) => {
  const path = usePathname();
  const currentLanguage = getCurrentLanguage(path);
  const [lang] = useState(currentLanguage.code);

  return (
    <div className={rowClasses}>
      <Link
        href={`/${lang}/privacy`}
        className={linkClasses}
        data-testid='linkPrivacy'
      >
        {dict.footer.privacyPolicy}
      </Link>
      <Link
        href={`/${lang}/terms`}
        className={linkClasses}
        data-testid='linkTerms'
      >
        {dict.footer.termsConditions}
      </Link>
      {/*
        A plain anchor, not `next/link`: this leaves the app, so there is nothing to
        prefetch and nothing for the router to do. Nothing is requested from Ko-fi
        until the click and nothing is passed to it with the click - no query
        string, and `noreferrer` withholds the referrer, so Ko-fi is not told which
        wishy page it came from. That is what the privacy policy tells people. `noopener` is spelled out although current browsers
        imply it for `_blank`, the same as the idea links in `gift-card.tsx`, so an
        older browser does not give the new tab a handle back to this one.
      */}
      <a
        href={SUPPORT_URL}
        target='_blank'
        rel='noopener noreferrer'
        className={linkClasses}
        data-testid='linkSupport'
      >
        {dict.footer.support}
      </a>
    </div>
  );
};

export default memo(FooterLinks);
