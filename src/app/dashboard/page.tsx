import DashboardClient from '@/app/dashboard/client'
import { ConfidentialCoinContextProvider } from '@/app/dashboard/context'

export default function DashboardPage() {
  return (
    <ConfidentialCoinContextProvider>
      <DashboardClient />
    </ConfidentialCoinContextProvider>
  )
}
