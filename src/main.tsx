import '@/theme/styles.scss'
import '@/localization'
import 'virtual:svg-icons-register'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/App'
import { ToastsManager } from '@/contexts'

const root = createRoot(document.getElementById('root') as Element)

root.render(
  <StrictMode>
    <ToastsManager>
      <App />
    </ToastsManager>
  </StrictMode>,
)
