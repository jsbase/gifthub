import { NextPage } from 'next';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

/*
  The same document shape as the privacy policy and deliberately not the same
  number of sections: these are rendered from an array rather than from a hardcoded
  `Array.from({ length: 6 }, ...)`, because a flat list of numbered keys makes
  inserting a clause in the middle a renumbering of everything after it, and these
  two documents are edited as documents rather than as a component's assumptions.

  As there, the titles carry their own numbers and are printed as written - they
  are published prose, and the numbering is part of what a reader was told.
*/
const TermsConditions: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <div className={cn('flex', 'flex-col', 'min-h-screen')}>
      <Header dict={dict} />
      <main className='flex-1'>
        <div className={cn('container', 'mx-auto')}>
          <div className={cn('mx-auto', 'max-w-2xl', 'py-12', 'sm:py-16')}>
            <h1
              className={cn(
                'text-[clamp(1.75rem,4vw,2.25rem)]',
                'font-semibold',
                'leading-tight',
                'tracking-[-0.01em]',
                'text-balance',
                'break-words'
              )}
            >
              {dict.terms.title}
            </h1>

            {dict.terms.sections.map((section) => (
              <section key={section.title} className='mt-10'>
                <h2
                  className={cn(
                    'text-lg',
                    'font-semibold',
                    'leading-snug',
                    'text-balance'
                  )}
                >
                  {section.title}
                </h2>
                <p
                  className={cn('mt-2', 'max-w-[68ch]', 'prose-p', 'break-words')}
                >
                  {section.content}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default TermsConditions;