import sitemap from '@astrojs/sitemap'
import vue from '@astrojs/vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://tickbox.dev',
  // The docs live on a subdomain. Someone guessing tickbox.dev/docs used to
  // hit a bare 404; redirect them to the real docs site instead. Static
  // build emits a meta-refresh redirect page.
  redirects: {
    '/docs': 'https://docs.tickbox.dev',
  },
  integrations: [
    // Vue island integration — the interactive /builder page is a Vue island
    // that renders the real @tickboxhq/banner-default for live preview.
    vue(),
    // Auto-generates sitemap-index.xml + sitemap-0.xml from the page graph.
    // Referenced from public/robots.txt so crawlers can find it.
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
