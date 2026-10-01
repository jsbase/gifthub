import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...next,
  ...nextTs,
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
    '.kilo/**',
    '.github/agents/**',
    '.github/hooks/**',
    '.superpowers/**',
  ]),
]);
