import { FeatureCardProps } from "@/types";

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="block p-6 bg-background border rounded-lg shadow dark:bg-card-background dark:border-gray-700">
      <h5 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h5>
      <p className="font-normal text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
