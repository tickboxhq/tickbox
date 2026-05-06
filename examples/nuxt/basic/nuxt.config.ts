// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  modules: ['@tickboxhq/nuxt'],

  tickbox: {
    // ~/consent.config is the default; shown here for clarity
    configPath: '~/consent.config',
  },
})
