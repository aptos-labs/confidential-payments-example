import { config } from '@config'
import { useCallback, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useEffectOnce } from 'react-use'

import { Web3ContextProvider } from '@/contexts/Web3Provider'
import { ErrorHandler } from '@/helpers'
import { useViewportSizes } from '@/hooks'
import { createRouter } from '@/routes'
import { UiSpinner } from '@/ui'

const router = createRouter()

export function App() {
  const [isAppInitialized, setIsAppInitialized] = useState(false)

  useViewportSizes()

  const init = useCallback(async () => {
    try {
      if (config.APP_NAME) {
        document.title = config.APP_NAME
      }
    } catch (error) {
      ErrorHandler.processWithoutFeedback(error)
    }

    setIsAppInitialized(true)
  }, [])

  useEffectOnce(() => {
    init()
  })

  if (!isAppInitialized) return <UiSpinner />

  return (
    <Web3ContextProvider>
      <RouterProvider router={router} />
    </Web3ContextProvider>
  )
}
