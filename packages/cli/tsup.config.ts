import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'node20',
  external: ['@tickboxhq/core'],
  banner: { js: '#!/usr/bin/env node' },
})
