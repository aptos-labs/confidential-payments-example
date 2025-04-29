import { Suspense } from 'react'

import DashboardPageContent from '@/app/dashboard/content'

import Loading from './loading'

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardPageContent />
    </Suspense>
  )
}
