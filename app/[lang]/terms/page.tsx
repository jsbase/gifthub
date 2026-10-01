import { NextPage } from 'next';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

const TermsConditions: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const sections = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <div className={cn('flex', 'flex-col', 'min-h-screen')}>
      <Header dict={dict} />
      <main className='flex-1'>
        <div className={cn('container', 'mx-auto')}>
          <div className={cn('mx-auto', 'max-w-2xl', 'py-12', 'sm:py-16')}>
            <h1
              className={cn(
                'font-serif',
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

            {sections.map((sectionNum) => {
              const section =
                dict.terms[`section${sectionNum}` as keyof typeof dict.terms];

              if (!section || typeof section === 'string') return null;

              return (
                <section key={sectionNum} className='mt-10'>
                  <h2
                    className={cn(
                      'font-serif',
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
              );
            })}
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default TermsConditions;
