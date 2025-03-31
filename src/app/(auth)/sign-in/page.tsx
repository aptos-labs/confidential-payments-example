import Image from 'next/image'
import { Suspense } from 'react'

import LoginForm from '@/app/(auth)/sign-in/components/LoginForm'
import { cn } from '@/theme/utils'
import { UiCard, UiCardContent } from '@/ui/UiCard'

import Loading from './loading'

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <div className='flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10'>
        <div className='w-full max-w-sm md:max-w-3xl'>
          <div className={cn('flex flex-col gap-6')}>
            <UiCard className='overflow-hidden'>
              <UiCardContent className='grid p-0 md:grid-cols-2'>
                <div className='min-h-[400px]'>
                  <LoginForm />
                </div>
                <div className='relative hidden bg-muted md:block'>
                  <Image
                    src='https://plus.unsplash.com/premium_photo-1675404521313-a0fdc626f5b3?q=80&w=2160&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
                    alt='Image'
                    className='absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale'
                    width={100}
                    height={100}
                  />
                </div>
              </UiCardContent>
            </UiCard>
            <div className='text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary'>
              By clicking continue, you agree to our{' '}
              <a href='#'>Terms of Service</a> and{' '}
              <a href='#'>Privacy Policy</a>.
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  )
}
