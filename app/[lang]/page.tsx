import { getDictionary } from './dictionaries';
import { Translations } from "@/types";
import { GiftIcon } from "lucide-react";
import { AuthButtons } from '@/components/auth-buttons';
import { Header } from "@/components/header";
import { Footer } from '@/components/footer';
import { FeatureCard } from '@/components/feature-card';
import { HomeProps } from '@/types';

export default async function Home({ params }: HomeProps) {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <div className="flex flex-col min-h-screen">
      <Header dict={dict} />
      <main className="flex-1 bg-gradient-to-b from-background to-muted">
        <div className="container max-w-screen-xl text-center py-8 lg:py-16">
          {/* Logo and Title */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <GiftIcon className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-extrabold tracking-tight leading-none text-foreground md:text-5xl lg:text-6xl">
              GiftHub
            </h1>
          </div>

          {/* Tagline */}
          <p className="mb-8 text-lg font-normal text-muted-foreground lg:text-xl sm:px-16 lg:px-48">
            {dict.tagline}
          </p>

          {/* Auth Buttons */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0">
            <AuthButtons dict={dict} />
          </div>

          {/* Feature Cards */}
          <div className="text-center my-12 lg:mb-0 md:mb-0 grid grid-cols-1 md:grid-cols-3 gap-dialog-desktop xs:gap-dialog-mobile">
            {Object.entries(dict.features).map(([key, feature]) => (
              <FeatureCard
                key={key}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
}
