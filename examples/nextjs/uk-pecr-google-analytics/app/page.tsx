'use client'

import { ConsentBanner, useConsent } from '@tickboxhq/react'

export default function Home() {
  const analytics = useConsent('analytics')

  return (
    <>
      <h1>Tickbox Next.js — UK PECR + Google Analytics</h1>
      <p>
        Open DevTools → Network. <strong>No requests to <code>googletagmanager.com</code>{' '}
        or <code>google-analytics.com</code> until you click Accept.</strong>
      </p>
      <p>Analytics: <strong>{analytics.granted ? 'granted' : 'denied'}</strong></p>

      <button
        type="button"
        onClick={() => {
          document.cookie = '__tb_consent=; Path=/; Max-Age=0'
          location.reload()
        }}
      >
        Reset consent
      </button>

      <ConsentBanner>
        {({ grantAll, denyAll }) => (
          <div
            role="dialog"
            aria-label="Cookie preferences"
            style={{
              position: 'fixed',
              insetInline: '1rem',
              bottom: '1rem',
              maxWidth: '32rem',
              margin: '0 auto',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
              padding: '1rem 1.25rem',
            }}
          >
            <p style={{ margin: 0 }}>We use Google Analytics. Reject if you'd rather not be tracked.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button type="button" onClick={denyAll}>Reject all</button>
              <button type="button" onClick={grantAll} style={{ background: '#0ea5e9', color: 'white', border: 0, padding: '0.4rem 0.8rem', borderRadius: '0.25rem' }}>
                Accept all
              </button>
            </div>
          </div>
        )}
      </ConsentBanner>
    </>
  )
}
