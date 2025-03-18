import '@/theme/styles.scss'

import { Client } from '@/app/[[...slug]]/client'

export function generateStaticParams() {
  return [{ slug: [''] }]
}

export default function RootPage() {
  return <Client />
}
