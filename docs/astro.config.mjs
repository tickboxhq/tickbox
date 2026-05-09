import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import { createStarlightTypeDocPlugin } from 'starlight-typedoc'

const [coreTypeDoc, coreSidebarGroup] = createStarlightTypeDocPlugin()
const [reactTypeDoc, reactSidebarGroup] = createStarlightTypeDocPlugin()
const [vueTypeDoc, vueSidebarGroup] = createStarlightTypeDocPlugin()
const [bannerTypeDoc, bannerSidebarGroup] = createStarlightTypeDocPlugin()

// typedoc-plugin-markdown defaults to .html which Astro's content collection
// doesn't pick up — force .md. The rest is presentation: render parameters,
// properties and enum members as tables instead of long bullet lists.
const sharedTypeDocOptions = {
  fileExtension: '.md',
  useCodeBlocks: true,
  expandObjects: true,
  parametersFormat: 'table',
  propertiesFormat: 'table',
  enumMembersFormat: 'table',
  typeDeclarationFormat: 'table',
  indexFormat: 'table',
}

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
      plugins: [
        coreTypeDoc({
          entryPoints: ['../packages/core/src/index.ts'],
          tsconfig: '../packages/core/tsconfig.json',
          output: 'api/core',
          sidebar: { label: '@tickboxhq/core', collapsed: true },
          typeDoc: sharedTypeDocOptions,
        }),
        reactTypeDoc({
          entryPoints: ['../packages/react/src/index.ts'],
          tsconfig: '../packages/react/tsconfig.json',
          output: 'api/react',
          sidebar: { label: '@tickboxhq/react', collapsed: true },
          typeDoc: sharedTypeDocOptions,
        }),
        vueTypeDoc({
          entryPoints: ['../packages/vue/src/index.ts'],
          tsconfig: '../packages/vue/tsconfig.json',
          output: 'api/vue',
          sidebar: { label: '@tickboxhq/vue', collapsed: true },
          typeDoc: sharedTypeDocOptions,
        }),
        bannerTypeDoc({
          entryPoints: [
            '../packages/banner-default/src/react/index.tsx',
            '../packages/banner-default/src/vue/index.ts',
          ],
          tsconfig: '../packages/banner-default/tsconfig.json',
          output: 'api/banner-default',
          sidebar: { label: '@tickboxhq/banner-default', collapsed: true },
          typeDoc: sharedTypeDocOptions,
        }),
      ],
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
            { label: 'Supported vendors', slug: 'concepts/vendors' },
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
        {
          label: 'API reference',
          collapsed: true,
          items: [coreSidebarGroup, reactSidebarGroup, vueSidebarGroup, bannerSidebarGroup],
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
