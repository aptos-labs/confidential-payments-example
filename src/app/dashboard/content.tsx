'use client'

import { useState } from 'react'
import { useTimeoutFn } from 'react-use'

import { preloadTablesForBalances } from '@/api/modules/aptos/wasmPollardKangaroo'
import DashboardClient from '@/app/dashboard/client'
import { ConfidentialCoinContextProvider } from '@/app/dashboard/context'
import Loading from '@/app/dashboard/loading'
import { ErrorHandler } from '@/helpers'

export default function DashboardPageContent() {
  'use client'

  const [isInitialized, setIsInitialized] = useState(false)

  useTimeoutFn(async () => {
    setIsInitialized(false)
    try {
      await preloadTablesForBalances()
    } catch (error) {
      ErrorHandler.processWithoutFeedback(error)
    }
    setIsInitialized(true)
  }, 10)

  if (!isInitialized) return <Loading />

  return (
    <ConfidentialCoinContextProvider>
      <DashboardClient />
    </ConfidentialCoinContextProvider>
  )
}
