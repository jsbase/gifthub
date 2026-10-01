import { NextPage } from 'next';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

const PrivacyPolicy: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const sections = Array.from({ length: 10 }, (_, i) => i + 1);

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
              {dict.privacy.title}
            </h1>

            {sections.map((sectionNum) => {
              const section =
                dict.privacy[`section${sectionNum}` as keyof typeof dict.privacy];

              if (!section || typeof section === 'string') return null;

              return (
                <section key={sectionNum} className={cn('mt-10')}>
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

                  {sectionNum === 3 && 'subtitle1' in section ? (
                    <>
                      <h3
                        className={cn(
                          'mt-5',
                          'text-[0.9375rem]',
                          'font-medium',
                          'leading-snug'
                        )}
                      >
                        {section.subtitle1}
                      </h3>
                      <p className={cn('mt-2', 'max-w-[68ch]', 'prose-p')}>
                        {section.content1}
                      </p>
                      <h3
                        className={cn(
                          'mt-5',
                          'text-[0.9375rem]',
                          'font-medium',
                          'leading-snug'
                        )}
                      >
                        {section.subtitle2}
                      </h3>
                      <p className={cn('mt-2', 'max-w-[68ch]', 'prose-p')}>
                        {section.content2}
                      </p>
                    </>
                  ) : 'content' in section ? (
                    <p className={cn('mt-2', 'max-w-[68ch]', 'prose-p')}>
                      {section.content}
                    </p>
                  ) : null}
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

export default PrivacyPolicy;
