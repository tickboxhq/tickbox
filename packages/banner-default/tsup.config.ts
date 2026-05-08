import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'react/index': 'src/react/index.tsx',
    'vue/index': 'src/vue/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  target: 'es2022',
  external: ['react', 'vue', '@tickboxhq/core', '@tickboxhq/react', '@tickboxhq/vue'],
  outDir: 'dist',
})
