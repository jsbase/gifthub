import { NextPage } from 'next';
import getDictionary from '@/app/[lang]/dictionaries';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { cn } from '@/lib/utils';
import type { PageProps } from '@/types';

const PrivacyPolicy: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const { sections, subsections } = dict.privacy;

  /*
    Where the sub-sections belong, and why it has to be worked out rather than
    declared.

    `PrivacyTranslations.subsections` is one array on the document, not an array on
    the section it belongs to, so the type does not say which section owns them.
    This app's answer is: the one with no lead sentence. The section that used to
    carry `subtitle1`/`content1`/`subtitle2`/`content2` on its own object was section
    3, and its `content` is now an empty string in all three locales precisely
    because those two paragraphs ARE its body - there was never a sentence above
    them to keep. So the sub-sections are rendered inside the first section whose
    `content` is empty, and a section with an empty `content` is never given an
    empty paragraph of its own.

    That rule is load-bearing in both directions. The obvious alternative -
    rendering the array after the last section - would file two paragraphs about
    registration underneath the section on changes to this policy, which is
    published legal prose on a deployed app. The rule is stated rather than
    configured because the alternative shape is one field away: putting
    `subsections` on the section itself would make this lookup disappear.
  */

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
              {dict.privacy.title}
            </h1>

            {sections.map((section) => {
              const carriesSubsections = section.content === '';
              const hasContent = section.content !== '';

              return (
                <section key={section.title} className={cn('mt-10')}>
                  {/*
                    The titles carry their own numbers ("1. …") and are printed
                    exactly as the dictionary writes them. This page is published
                    legal prose: the numbering is part of what people are told, and
                    a section that renumbered itself to match a new array would move
                    the clause somebody last read. So the renderer adds nothing,
                    and the numbers live in the text where a reader finds them.
                  */}
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

                  {hasContent && (
                    <p className={cn('mt-2', 'max-w-[68ch]', 'prose-p')}>
                      {section.content}
                    </p>
                  )}

                  {carriesSubsections &&
                    subsections?.map((subsection) => (
                      <div key={subsection.title} className={cn('mt-5')}>
                        <h3
                          className={cn(
                            'text-[0.9375rem]',
                            'font-medium',
                            'leading-snug'
                          )}
                        >
                          {subsection.title}
                        </h3>
                        <p className={cn('mt-2', 'max-w-[68ch]', 'prose-p')}>
                          {subsection.content}
                        </p>
                      </div>
                    ))}
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