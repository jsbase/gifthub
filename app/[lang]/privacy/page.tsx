import { getDictionary } from "../dictionaries";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { PrivacyPageProps } from "@/types";

export default async function PrivacyPolicy({ params }: PrivacyPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const sections = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <>
      <Header dict={dict} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">{dict.privacy.title}</h1>

        {sections.map((sectionNum) => {
          const section = dict.privacy[`section${sectionNum}` as keyof typeof dict.privacy];
          
          if (!section || typeof section === 'string') return null;

          return (
            <section key={sectionNum} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
              
              {sectionNum === 3 && 'subtitle1' in section ? (
                <>
                  <h3 className="text-lg font-medium mb-2">{section.subtitle1}</h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-300">{section.content1}</p>
                  <h3 className="text-lg font-medium mb-2">{section.subtitle2}</h3>
                  <p className="mb-4 text-gray-600 dark:text-gray-300">{section.content2}</p>
                </>
              ) : (
                'content' in section ? (
                  <p className="mb-4 text-gray-600 dark:text-gray-300">{section.content}</p>
                ) : null
              )}
            </section>
          );
        })}
      </div>
      <Footer dict={dict} />
    </>
  );
}
