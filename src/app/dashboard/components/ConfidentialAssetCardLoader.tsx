import { ComponentPropsWithoutRef } from 'react'

import { cn } from '@/theme/utils'
import { UiSkeleton } from '@/ui/UiSkeleton'

export default function ConfidentialAssetCardLoader(
  props: ComponentPropsWithoutRef<'div'>,
) {
  return (
    <div {...props} className={cn('relative isolate', props.className)}>
      <div className='flex size-full flex-col items-center gap-4 rounded-2xl p-4'>
        <div className='relative flex items-center gap-2'>
          <UiSkeleton className='size-5 rounded-full' />
          <UiSkeleton className='h-3 w-32' />
          <UiSkeleton className='size-6' />
        </div>

        <div className='flex items-end gap-1'>
          <UiSkeleton className='h-16 w-24' />
          <UiSkeleton className='h-8 w-12' />
        </div>
      </div>
    </div>
  )
}
