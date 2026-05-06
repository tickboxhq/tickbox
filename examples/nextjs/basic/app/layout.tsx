import type { ReactNode } from 'react'
import Provider from './consent-provider'

export const metadata = {
  title: 'Tickbox Next.js example',
  description: 'Tickbox consent SDK in a Next.js App Router project',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
