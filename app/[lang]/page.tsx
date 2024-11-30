import { NextPage } from 'next';
import React from 'react';
import { getDictionary } from './dictionaries';
import { Header } from "@/components/header";
import { Logo } from "@/components/logo";
import { AuthButtons } from '@/components/auth-buttons';
import { Footer } from '@/components/footer';
import FeatureCards from '@/components/feature-cards';
import { cn } from '@/lib/utils';
import { PageProps, Translations } from '@/types';

const Home: NextPage<PageProps> = async ({ params }) => {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <div className={cn("flex", "flex-col", "min-h-screen")}>
      <Header dict={dict} />
      <main className={cn(
        "flex-1",
        "bg-gradient-to-b",
        "from-background",
        "to-muted"
      )}>
        <div className={cn(
          "container",
          "max-w-screen-xl",
          "text-center",
          "py-8",
          "lg:py-16"
        )}>
          <Logo size="lg" className={cn("mb-4", "justify-center")} />
          <p className={cn(
            "mb-8",
            "text-lg",
            "font-normal",
            "text-muted-foreground",
            "lg:text-xl",
            "sm:px-16",
            "lg:px-48"
          )}>
            {dict.tagline}
          </p>
          <div className={cn(
            "flex",
            "flex-col",
            "space-y-4",
            "sm:flex-row",
            "sm:justify-center",
            "sm:space-y-0"
          )}>
            <AuthButtons dict={dict} />
          </div>
          <FeatureCards features={dict.features} />
        </div>
      </main>
      <Footer dict={dict} />
    </div>
  );
};

export default Home;
