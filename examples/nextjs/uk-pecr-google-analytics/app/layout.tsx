import Script from 'next/script'
import type { ReactNode } from 'react'
import Provider from './consent-provider'

export const metadata = {
  title: 'Tickbox Next.js — UK PECR + Google Analytics',
}

// Replace with your real GA4 Measurement ID
const GA_ID = 'G-XXXXXXXX'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          1) Consent Mode v2 default — sets dataLayer state. No network requests.
             Uses next/script with `beforeInteractive` so it runs before any
             other script in <head> on first load.
        */}
        <Script id="tb-consent-default" strategy="beforeInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});`}
        </Script>

        {/*
          2) GA loader — gated. Browsers do not fetch src on a type=text/plain
             script. Tickbox flips the type to text/javascript once the
             visitor accepts.
        */}
        <script type="text/plain" data-tb-category="analytics" src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} async />

        {/*
          3) GA config — also gated.
        */}
        <script type="text/plain" data-tb-category="analytics">
          {`gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true,client_storage:'none',anonymize_ip:true});`}
        </script>
      </head>
      <body style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
