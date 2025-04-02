'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { ErrorHandler, tryCatch } from '@/helpers'
import { authStore } from '@/store/auth'
import { cn } from '@/theme/utils'
import { UiButton } from '@/ui/UiButton'

export default function HomepageLinkContent() {
  const router = useRouter()

  const isInitialing = useRef(false)

  const [isLoading, setIsLoading] = useState(false)

  const { getGoogleRequestLoginUrl, loginWithGoogle, loginWithApple } =
    authStore.useLogin({
      onSuccess: () => {
        router.push('/dashboard')
      },
    })

  const fragmentParams = new URLSearchParams(window.location.hash.substring(1))
  const googleIdToken = fragmentParams.get('id_token')
  const appleIdToken = fragmentParams.get('token')

  useEffect(() => {
    if (isInitialing.current) return
    isInitialing.current = true

    if (!googleIdToken && !appleIdToken) return

    const loginWithSocial = async () => {
      setIsLoading(true)

      const [, error] = await tryCatch(
        (async () => {
          if (googleIdToken) {
            loginWithGoogle(googleIdToken)
          } else if (appleIdToken) {
            loginWithApple(appleIdToken)
          }
        })(),
      )
      if (error) {
        ErrorHandler.process(error)
        router.push('/')
      }
    }

    loginWithSocial()
  }, [appleIdToken, googleIdToken, loginWithApple, loginWithGoogle, router])

  return (
    <Link href={getGoogleRequestLoginUrl}>
      <UiButton
        variant='outline'
        className={cn(
          'mt-3 min-w-[200px] bg-textPrimary px-6 py-3 text-backgroundPrimary hover:cursor-pointer',
          isLoading && 'animate-pulse',
        )}
        disabled={isLoading}
        onClick={() => {
          setIsLoading(true)
        }}
      >
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
          <path
            d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
            fill='currentColor'
          />
        </svg>
        <span>
          {isLoading ? 'Wait... Signing with google' : 'Login with Google'}
        </span>
      </UiButton>
    </Link>
  )
}
