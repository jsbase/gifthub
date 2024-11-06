import { getDictionary } from './dictionaries';
import { Translations } from "@/types";
import { GiftIcon } from "lucide-react";
import { AuthButtons } from '@/components/auth-buttons';
import { Header } from "@/components/header";
import { Footer } from '@/components/footer';

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="block p-6 bg-white border border-gray-200 rounded-lg shadow dark:bg-card-background dark:border-gray-700">
      <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h5>
      <p className="font-normal text-gray-700 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <>
      <Header dict={dict} />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted">
        <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <GiftIcon className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-extrabold tracking-tight leading-none text-foreground md:text-5xl lg:text-6xl">
              GiftHub
            </h1>
          </div>

          <p className="mb-8 text-lg font-normal text-muted-foreground lg:text-xl sm:px-16 lg:px-48">
            {dict.tagline}
          </p>

          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0">
            <AuthButtons dict={dict} />
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title={dict.features.simple.title}
              description={dict.features.simple.description}
            />
            <FeatureCard
              title={dict.features.tracking.title}
              description={dict.features.tracking.description}
            />
            <FeatureCard
              title={dict.features.updates.title}
              description={dict.features.updates.description}
            />
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </>
  );
}
