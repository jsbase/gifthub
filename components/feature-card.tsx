import { FeatureCardProps } from "@/types";

export function FeatureCard({ title, description }: FeatureCardProps) {
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
