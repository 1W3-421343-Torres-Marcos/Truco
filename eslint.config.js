import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * Reglas de capas (ver AGENTS.md):
 * ui → store → ai / persistence → engine. Nunca hacia arriba.
 */
const layerImport = (layers) =>
  layers.map((layer) => ({
    group: [`**/${layer}`, `**/${layer}/**`],
    message: `Esta capa no puede importar de src/${layer} (las dependencias van solo hacia abajo).`,
  }));

const reactImports = [
  { name: 'react', message: 'El engine es puro: sin React.' },
  { name: 'react-dom', message: 'El engine es puro: sin React.' },
];

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: reactImports, patterns: layerImport(['ai', 'persistence', 'store', 'ui']) },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Usá el RNG inyectable con semilla.' },
        {
          object: 'Date',
          property: 'now',
          message: 'El engine es determinista: recibí el tiempo como dato.',
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'El engine no usa el DOM.' },
        { name: 'document', message: 'El engine no usa el DOM.' },
        { name: 'localStorage', message: 'El engine no persiste: eso es de src/persistence.' },
      ],
    },
  },
  {
    files: ['src/ai/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: reactImports, patterns: layerImport(['persistence', 'store', 'ui']) },
      ],
    },
  },
  {
    files: ['src/persistence/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: reactImports, patterns: layerImport(['ai', 'store', 'ui']) },
      ],
    },
  },
  {
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: layerImport(['ui']) }],
    },
  },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
