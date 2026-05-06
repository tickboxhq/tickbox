import {
  addComponent,
  addImports,
  addPlugin,
  addServerHandler,
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

  /**
   * Register a Nitro route at `/ai.txt` that serves the Spawning.ai-format
   * AI training opt-out file generated from the consent config.
   *
   * EU AI Act Article 53 (in force August 2026) requires general-purpose AI
   * providers to respect machine-readable opt-out signals. The `ai.txt` file
   * is the convention this satisfies.
   *
   * Set to `false` to skip registering the route (e.g. if you want to serve
   * a static file instead, or write your own handler).
   *
   * @default true
   */
  aiTxt?: boolean
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
    aiTxt: true,
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
    // template lands in `.nuxt/tickbox-config.mjs`. The Vue/client plugin
    // imports it via Nuxt's built-in `#build/` alias. Nitro server runtime
    // can't use `#build/` (Nuxt's impound plugin blocks Vue-app aliases in
    // server context), so we expose the same file via a Nitro-specific
    // alias `#tickbox-config`.
    const templateFile = `${nuxt.options.buildDir}/tickbox-config.mjs`
    addTemplate({
      filename: 'tickbox-config.mjs',
      write: true,
      getContents: () => `export { default } from ${JSON.stringify(resolvedConfigPath)}\n`,
    })
    // biome-ignore lint/suspicious/noExplicitAny: nitro:config hook types live in @nitrojs/core, not @nuxt/schema
    ;(nuxt.hook as any)('nitro:config', (nitroConfig: { alias?: Record<string, string> }) => {
      nitroConfig.alias = nitroConfig.alias || {}
      nitroConfig.alias['#tickbox-config'] = templateFile
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

    // Register the /ai.txt Nitro route. Reads the same `#build/tickbox-config`
    // virtual template the client plugin uses, so a single source of truth
    // governs both the cookie banner and the AI opt-out signal.
    if (options.aiTxt !== false) {
      addServerHandler({
        route: '/ai.txt',
        handler: resolver.resolve('./runtime/server/ai-txt'),
      })
    }
  },
})

export default tickboxModule
