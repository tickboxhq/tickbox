import { ConsentBanner, useConsent } from '@tickboxhq/react'

export default function App() {
  const marketing = useConsent('marketing')

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 640, margin: '4rem auto', padding: '0 1rem' }}>
      <h1>Tickbox React example</h1>

      <p>Marketing consent: <strong>{marketing.granted ? 'granted' : 'denied'}</strong></p>
      <p>Mode: <code>{marketing.mode}</code></p>

      {marketing.granted ? (
        <p>Imagine a Meta Pixel firing here.</p>
      ) : (
        <p style={{ color: '#666' }}>Marketing scripts won't load until you accept.</p>
      )}

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
        {({ resolved, grantAll, denyAll }) => (
          <div
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
            role="dialog"
            aria-label="Cookie preferences"
          >
            <p style={{ margin: 0 }}>
              We use {resolved.length - 1} cookie categories. Pick what you're OK with.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button type="button" onClick={denyAll}>Reject all</button>
              <button type="button" onClick={grantAll} style={{ background: '#0ea5e9', color: 'white', border: 0, padding: '0.4rem 0.8rem', borderRadius: '0.25rem' }}>
                Accept all
              </button>
            </div>
          </div>
        )}
      </ConsentBanner>
    </div>
  )
}
