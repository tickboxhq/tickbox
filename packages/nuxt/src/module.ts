import {
  addComponent,
  addImports,
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  resolveAlias,
} from '@nuxt/kit'
import type { NuxtModule } from '@nuxt/schema'

export interface ModuleOptions {
  /**
   * Path to the user's consent config file.
   * The file must default-export a `ConsentConfig` (typically created via `defineConsent`).
   *
   * @default '~/consent.config'
   */
  configPath?: string
}

const tickboxModule: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@tickboxhq/nuxt',
    configKey: 'tickbox',
    compatibility: {
      nuxt: '>=3.0.0',
    },
  },
  defaults: {
    configPath: '~/consent.config',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Resolve the user's config path. Match Nuxt's own alias semantics:
    // `~` and `@` map to srcDir (which is `app/` in Nuxt 4, the project root
    // in Nuxt 3); `~~` and `@@` map to rootDir.
    const aliases = {
      '~': nuxt.options.srcDir,
      '@': nuxt.options.srcDir,
      '~~': nuxt.options.rootDir,
      '@@': nuxt.options.rootDir,
    }
    const resolvedConfigPath = resolveAlias(options.configPath ?? '~/consent.config', aliases)

    // Generate a virtual template that re-exports the user's config. The
    // template lands in `.nuxt/tickbox-config.mjs` and is reachable from any
    // runtime context (Vite + Nitro) via Nuxt's built-in `#build/` alias.
    addTemplate({
      filename: 'tickbox-config.mjs',
      write: true,
      getContents: () => `export { default } from ${JSON.stringify(resolvedConfigPath)}\n`,
    })

    // Make Vue type augmentations available everywhere.
    nuxt.options.build.transpile.push('@tickboxhq/vue', '@tickboxhq/core')

    // Plugin: creates the ConsentStore, hydrates from the request cookie on
    // the server, runs apply-consent side effects on the client, and provides
    // the store to the entire Vue app.
    addPlugin(resolver.resolve('./runtime/plugin'))

    // Auto-import the composable so users can call `useConsent()` without imports.
    addImports([
      {
        name: 'useConsent',
        from: '@tickboxhq/vue',
      },
    ])

    // Auto-register the headless banner component so users can drop
    // `<ConsentBanner v-slot="{ resolved, grantAll, denyAll }">…</ConsentBanner>`
    // into a layout without importing.
    addComponent({
      name: 'ConsentBanner',
      filePath: '@tickboxhq/vue',
      export: 'ConsentBanner',
    })
  },
})

export default tickboxModule
