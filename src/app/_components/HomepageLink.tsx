'use client'

import Link from 'next/link'
import { useState } from 'react'

import { UiButton } from '@/ui/UiButton'

export default function HomepageLink() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Link href='/sign-in' prefetch>
      <UiButton
        className='mt-3 min-w-[200px] bg-textPrimary px-6 py-3 text-backgroundPrimary hover:cursor-pointer'
        disabled={isLoading}
        onClick={() => {
          setIsLoading(true)
        }}
      >
        Begin
      </UiButton>
    </Link>
  )
}
