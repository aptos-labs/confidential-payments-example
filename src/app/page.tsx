import Link from 'next/link'

import { UiButton } from '@/ui/UiButton'
import UiThreads from '@/ui/UiThreads'

export default async function RootPage() {
  return (
    <div className='isolate size-full bg-backgroundPrimary'>
      <div className='absolute inset-0 z-10 size-full'>
        <UiThreads amplitude={1} distance={0} enableMouseInteraction={true} />
      </div>

      <div className='absolute inset-0 z-20 flex size-full flex-col items-center justify-center gap-4 text-center'>
        <span className='tex-textPrimary typography-h1'>
          Confidential Assets
        </span>

        <span className='tex-textPrimary typography-subtitle1'>
          Bringing innovative solutions to secure your digital world.
        </span>

        <Link href='/login'>
          <UiButton className='mt-3 min-w-[200px] bg-textPrimary px-6 py-3 text-backgroundPrimary hover:cursor-pointer'>
            Begin
          </UiButton>
        </Link>
      </div>
    </div>
  )
}
