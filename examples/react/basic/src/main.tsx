import { ConsentProvider } from '@tickboxhq/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import config from './consent.config'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConsentProvider config={config}>
      <App />
    </ConsentProvider>
  </StrictMode>,
)
