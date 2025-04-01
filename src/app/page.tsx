import { cn } from '@/theme/utils'

import HomepageLink from './_components/HomepageLink'

export default async function RootPage() {
  return (
    <div className='isolate size-full max-w-[100vw] overflow-hidden bg-backgroundPrimary'>
      <div className='absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-4 text-center'>
        <span className='typography-h3 text-textPrimary sm:typography-h2 md:typography-h1'>
          Confidential Assets
        </span>

        <span className='tex-textPrimary typography-subtitle3 md:typography-subtitle1'>
          Bringing innovative solutions to secure your digital world.
        </span>

        <HomepageLink />
      </div>

      <div className='background-gradient absolute -bottom-[20%] -right-[20%] h-[70dvh] w-[75vw] rotate-[70deg] rounded-[50%] opacity-80 blur-[70px]' />

      <div
        className={cn(
          'absolute inset-0',
          'mix-blend-overlay dark:mix-blend-soft-light',
          'background-mask-gradient',
          'pointer-events-none',
        )}
        style={{
          maskImage: 'url("/images/background-mask.png")',
          WebkitMaskImage: 'url("/images/background-mask.png")',
          maskSize: 'cover',
          WebkitMaskSize: 'cover',
        }}
      />
    </div>
  )
}
