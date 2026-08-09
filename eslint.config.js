// Lint-Regeln für luma-ops.
//
// Bewusst schmal gehalten: Diese Konfiguration soll echte Fehler fangen
// (nicht deklarierte Namen, kaputte Hook-Aufrufe, unerreichbarer Code), nicht
// über Stil streiten. Ein Lint-Lauf, den man gewohnheitsmäßig ignoriert, ist
// kein Merge-Gate.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import react from 'eslint-plugin-react'

export default [
  {
    ignores: [
      'dist/**', 'android/**', 'ios/**', 'public/**',
      'node_modules/**', 'refs/**', '.playwright/**',
      // Deno-TypeScript, wird nicht mit dem Browser-Parser geprüft.
      'supabase/functions/**',
    ],
  },

  // Browser-Code
  {
    files: ['src/**/*.{js,jsx}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, react },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Ohne diese beiden Regeln hält no-unused-vars jede Komponente für
      // ungenutzt, die nur in JSX vorkommt — und der ganze Lint-Lauf wird zu
      // Rauschen, in dem echte Funde untergehen.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      // Ungenutzte Variablen sind meist Reste eines halben Umbaus. Mit
      // Unterstrich am Anfang bewusst behalten.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^(_|[A-Z_]+$)',
        caughtErrors: 'none',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Fangen echte Tippfehler in JSX-lastigem Code.
      'no-undef': 'error',
      'no-constant-binary-expression': 'error',
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      // Geschützte Leerzeichen vor Einheiten und Prozentzeichen sind in
      // deutschen Texten richtig und sollen bleiben. Nur außerhalb von
      // Zeichenketten sind sie ein Versehen.
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true, skipComments: true }],
    },
  },

  // ── Altbestand ──────────────────────────────────────────────────────────
  // Rund 830 ungenutzte Bezeichner und einige Hook-Befunde stammen aus der
  // Zeit vor diesem Gate. Sie sind Warnung, nicht Fehler: der Merge soll an
  // neuen Fehlern scheitern, nicht an geerbten. Die Zahl steht in
  // docs/MERGE_GATE.md und soll fallen, nicht wachsen.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/biome/**'],
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^(_|[A-Z_]+$)',
        caughtErrors: 'none',
      }],
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/use-memo': 'warn',
    },
  },

  // Skripte und Prüfstand laufen in Node
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.{js,mjs}', '*.config.js', 'eslint.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },

  // Edge Functions (Deno)
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: { globals: { ...globals.deno } },
    rules: {},
  },
]
