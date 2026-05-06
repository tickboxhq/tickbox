import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/jurisdictions/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2022',
  splitting: false,
})
