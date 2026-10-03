import { defineConfig } from 'tsup';

export default defineConfig([
  // Core (vanilla JS) — ESM + CJS
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    minify: true,
    sourcemap: true,
    target: 'es2020',
  },
  // React sub-export — ESM + CJS
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    minify: true,
    sourcemap: true,
    target: 'es2020',
    external: ['react'],
  },
  // UMD/IIFE for CDN — single global `BackDismiss`
  {
    entry: { 'back-dismiss.min': 'src/index.ts' },
    format: ['iife'],
    globalName: 'BackDismissLib',
    minify: true,
    sourcemap: true,
    target: 'es2020',
    platform: 'browser',
    footer: {
      // Expose BackDismiss directly on window for CDN usage
      js: 'if(typeof window!=="undefined"){window.BackDismiss=BackDismissLib.BackDismiss;}',
    },
  },
]);
