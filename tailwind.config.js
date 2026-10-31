/** @type {import('tailwindcss').Config} */
export default {
  // Explicit list (no './**/*') so node_modules and dist are never scanned.
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './types.ts',
  ],
  theme: { extend: {} },
  plugins: [],
};
