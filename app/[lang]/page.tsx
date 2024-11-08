import { getDictionary } from './dictionaries';
import { Translations } from "@/types";
import { AuthButtons } from '@/components/auth-buttons';
import { Header } from "@/components/header";
import { Footer } from '@/components/footer';
import { FeatureCard } from '@/components/feature-card';
import { HomeProps } from '@/types';
import { cn } from '@/lib/utils';
import { Logo } from "@/components/logo";

export default async function Home({ params }: HomeProps) {
  const { lang } = await params;
  const dict: Translations = await getDictionary(lang);

  return (
    <div className={cn(
      "flex",
      "flex-col",
      "min-h-screen"
    )}>
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
          {/* Logo and Title */}
          <Logo size="lg" className={cn(
            "mb-4",
            "justify-center"
          )} />

          {/* Tagline */}
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

          {/* Auth Buttons */}
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

          {/* Feature Cards */}
          <div className={cn(
            "text-center",
            "my-12",
            "lg:mb-0",
            "md:mb-0",
            "grid",
            "grid-cols-1",
            "md:grid-cols-3",
            "gap-dialog-desktop",
            "xs:gap-dialog-mobile"
          )}>
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
