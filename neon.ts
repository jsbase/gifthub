import { defineConfig } from "@neon/config/v1";

// The Neon project holds exactly three long-lived branches: `production` (the
// default branch, what the deployed app reads), `preview` (Vercel's Preview
// environment) and `dev` (local development and Vercel's Development
// environment). Nothing creates a fourth.
//
// The absence of a branch policy here is the point, and it is why the seven-day
// TTL this file used to set on every new branch is gone. That TTL made sense
// while a Vercel preview deployment provisioned a throwaway database per git
// branch: those branches were disposable, and the free plan caps a project at
// ten, so a preview-heavy week ran the project out of branches. The integration
// that created them has been removed, so a TTL would now only surprise someone
// who made a branch deliberately.
export default defineConfig({
  auth: false,
});