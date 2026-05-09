import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://docs.tickbox.dev',
  integrations: [
    starlight({
      title: 'Tickbox',
      description:
        'Developer-first cookie consent SDK for the UK and EU. PECR-correct script gating, Google Consent Mode v2, AI training opt-out.',
      customCss: ['./src/styles/custom.css'],
      logo: {
        src: './src/assets/logo.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/tickboxhq/tickbox',
      },
      editLink: {
        baseUrl: 'https://github.com/tickboxhq/tickbox/edit/main/docs/',
      },
      lastUpdated: true,
      pagination: true,
      sidebar: [
        {
          label: 'Getting started',
          items: [
            { label: 'Overview', slug: 'getting-started/overview' },
            { label: 'Vanilla JS', slug: 'getting-started/vanilla' },
            { label: 'React / Next.js', slug: 'getting-started/react' },
            { label: 'Vue', slug: 'getting-started/vue' },
            { label: 'Nuxt', slug: 'getting-started/nuxt' },
            { label: 'Default styled banner', slug: 'getting-started/banner-default' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Jurisdictions', slug: 'concepts/jurisdictions' },
            { label: 'Consent modes', slug: 'concepts/modes' },
            { label: 'Script gating (PECR)', slug: 'concepts/gating' },
            { label: 'Google Consent Mode v2', slug: 'concepts/consent-mode-v2' },
            { label: 'AI training opt-out', slug: 'concepts/ai-opt-out' },
          ],
        },
        {
          label: 'Recipes',
          items: [
            { label: 'Google Analytics (PECR-correct)', slug: 'recipes/google-analytics' },
            { label: 'Plausible / GoatCounter', slug: 'recipes/plausible-goatcounter' },
            { label: 'Multi-jurisdiction (UK + EU)', slug: 'recipes/multi-jurisdiction' },
            { label: 'Cloudflare bot blocking', slug: 'recipes/cloudflare-bots' },
            { label: 'Internationalisation (i18n)', slug: 'recipes/i18n' },
          ],
        },
        {
          label: 'Migrations',
          items: [
            { label: 'From OneTrust', slug: 'migrations/onetrust' },
            { label: 'From Cookiebot', slug: 'migrations/cookiebot' },
          ],
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#1f2328' },
        },
      ],
    }),
  ],
})
