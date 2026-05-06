// Replace G-XXXXXXXX with your GA4 Measurement ID before deploying.
const GA_ID = 'G-XXXXXXXX'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  modules: ['@tickboxhq/nuxt'],

  app: {
    head: {
      script: [
        // 1) Consent Mode v2 default — sets dataLayer state. No network requests.
        //    Tickbox calls gtag('consent','update',...) on every consent change.
        {
          innerHTML: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});`,
        },
        // 2) GA loader — gated. Browsers don't fetch src on type=text/plain,
        //    so no request leaves until consent is granted. PECR Reg 6(1).
        {
          type: 'text/plain',
          'data-tb-category': 'analytics',
          src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
          async: true,
        },
        // 3) GA config — also gated.
        {
          type: 'text/plain',
          'data-tb-category': 'analytics',
          innerHTML: `gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true,client_storage:'none',anonymize_ip:true});`,
        },
      ],
    },
  },
})
