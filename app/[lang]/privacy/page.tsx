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
        <div
          className={cn('container', 'mx-auto', 'px-4', 'py-8', 'max-w-4xl')}
        >
          <h1 className={cn('text-3xl', 'font-bold', 'mb-6', 'break-words')}>
            {dict.privacy.title}
          </h1>

          {sections.map((sectionNum) => {
            const section =
              dict.privacy[`section${sectionNum}` as keyof typeof dict.privacy];

            if (!section || typeof section === 'string') return null;

            return (
              <section key={sectionNum} className={cn('mb-8')}>
                <h2 className={cn('text-xl', 'font-semibold', 'mb-4')}>
                  {section.title}
                </h2>

                {sectionNum === 3 && 'subtitle1' in section ? (
                  <>
                    <h3 className={cn('text-lg', 'font-medium', 'mb-2')}>
                      {section.subtitle1}
                    </h3>
                    <p
                      className={cn(
                        'mb-4',
                        'text-gray-600',
                        'dark:text-gray-300'
                      )}
                    >
                      {section.content1}
                    </p>
                    <h3 className={cn('text-lg', 'font-medium', 'mb-2')}>
                      {section.subtitle2}
                    </h3>
                    <p
                      className={cn(
                        'mb-4',
                        'text-gray-600',
                        'dark:text-gray-300'
                      )}
                    >
                      {section.content2}
                    </p>
                  </>
                ) : 'content' in section ? (
                  <p
                    className={cn(
                      'mb-4',
                      'text-gray-600',
                      'dark:text-gray-300'
                    )}
                  >
                    {section.content}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default PrivacyPolicy;
