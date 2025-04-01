'use client'

import Link from 'next/link'
import { useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { UiButton } from '@/ui/UiButton'

export default function HomepageLink() {
  const [isLoading, setIsLoading] = useState(false)

  const session = authClient.useSession()

  return (
    <Link href={session?.data?.user.id ? '/dashboard' : '/sign-in'} prefetch>
      <UiButton
        className='mt-3 min-w-[200px] bg-textPrimary px-6 py-3 text-backgroundPrimary hover:cursor-pointer'
        disabled={isLoading}
        onClick={() => {
          setIsLoading(true)
        }}
      >
        {session?.data?.user.id ? 'Go to dashboard' : 'Get started'}
      </UiButton>
    </Link>
  )
}
