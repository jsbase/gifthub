import { getDictionary } from "../dictionaries";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { TermsPageProps } from "@/types";

export default async function TermsConditions({ params }: TermsPageProps) {
  const { lang } = params;
  const dict = await getDictionary(lang);
  const sections = Array.from({ length: 6 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col min-h-screen">
      <Header dict={dict} />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-6">{dict.terms.title}</h1>

          {sections.map((sectionNum) => {
            const section = dict.terms[`section${sectionNum}` as keyof typeof dict.terms];

            if (!section || typeof section === 'string') return null;

            return (
              <section key={sectionNum} className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                <p className="mb-4 text-gray-600 dark:text-gray-300">{section.content}</p>
              </section>
            );
          })}
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
}
