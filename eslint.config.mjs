import { fixupPluginRules } from '@eslint/compat';
import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next';
import nextTs from 'eslint-config-next/typescript';

// eslint-config-next 16.3.8 pins eslint-plugin-react, eslint-plugin-import
// and eslint-plugin-jsx-a11y, and all three still call `context.getFilename()`,
// which ESLint 10 removed. eslint-plugin-react's peer range stops at ^9.7, so
// there is no version to upgrade to. `fixupPluginRules` re-adds the removed
// context members to each rule, which is the migration path ESLint documents
// for plugins that have not shipped v10 support yet.
//
// This shim is what keeps the lint gate runnable at all, so it must be wrapped
// around the plugin objects rather than left to a peer range: removing it turns
// `npm run lint` into a crash on the first React file, not into a warning.
// Delete it once eslint-config-next ships a plugin set that declares ^10.
const shimPlugins = (configs) =>
  configs.map((config) =>
    config.plugins
      ? {
          ...config,
          plugins: Object.fromEntries(
            Object.entries(config.plugins).map(([name, plugin]) => [
              name,
              fixupPluginRules(plugin),
            ])
          ),
        }
      : config
  );

export default defineConfig([
  ...shimPlugins(next),
  ...shimPlugins(nextTs),
  {
    // Rules that eslint-config-next 16 / typescript-eslint promote to errors on
    // code that predates the lint gate, downgraded to warnings. Rewriting these
    // call sites is a refactor of working application behaviour, not part of a
    // dependency upgrade, so they stay visible without blocking the gate.
    rules: {
      // React Compiler advisories. The manual useCallback dependency lists and
      // the state-sync effects are intentional; changing them would be a
      // performance refactor.
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      // The codebase types Prisma JSON columns and loosely-shaped callback
      // payloads as `any` throughout types.ts and app/sw.ts.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Config files are loaded by their own loaders (CJS plugins for Tailwind,
    // PostCSS), where require() is the correct import form.
    files: ['*.config.ts', '*.config.js', '*.config.mjs', '*.config.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'out/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'prisma/**',
    // Agent tooling and the plan workspace are vendored, not app source. They are
    // also gitignored: linting them would make the local warning count depend on
    // which agent tooling happens to be checked out, which the ratchet baseline
    // in lint-baseline.json cannot express.
    '.agents/**',
    '.claude/**',
    '.codex/**',
    '.cursor/**',
    '.kilo/**',
    '.github/agents/**',
    '.github/hooks/**',
    '.superpowers/**',
  ]),
]);
