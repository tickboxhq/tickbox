import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://tickbox.dev',
  // Vue island integration — the interactive /builder page is a Vue island
  // that renders the real @tickboxhq/banner-default for live preview.
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
  },
})
