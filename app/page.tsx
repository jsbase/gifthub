import { AuthButtons } from "@/components/auth-buttons";
import { GiftIcon } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center space-x-2 mb-8">
            <GiftIcon className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">GiftHub</h1>
          </div>
          
          <p className="text-xl text-muted-foreground">
            The simple way to manage gift ideas for your family and groups
          </p>
          
          <div className="mt-12">
            <AuthButtons />
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Simple Groups"
              description="Create and manage gift lists for your family or group with just a name and password"
            />
            <FeatureCard 
              title="Gift Tracking"
              description="Keep track of gift ideas, mark items as purchased, and avoid duplicate gifts"
            />
            <FeatureCard 
              title="Real-time Updates"
              description="See changes instantly across all devices without refreshing"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}