import { UiSeparator } from '@/ui/UiSeparator'
import { UiSkeleton } from '@/ui/UiSkeleton'

export default function Loading() {
  return (
    <div className='size-full'>
      {/* Header skeleton */}
      <header className='flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
        <UiSkeleton className='h-8 w-full max-w-[300px]' />
      </header>

      <UiSeparator />

      <div className='flex size-full flex-1 flex-col'>
        {/* Token card carousel skeleton */}
        <div className='w-full self-center py-6'>
          <UiSkeleton className='mx-auto h-[200px] w-full max-w-[400px] rounded-2xl' />
        </div>

        {/* Action buttons skeleton */}
        <div className='flex w-full flex-row items-center justify-center gap-8'>
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className='flex flex-col items-center gap-2'>
                <UiSkeleton className='size-10 rounded-[50%]' />
                <UiSkeleton className='h-4 w-16' />
              </div>
            ))}
        </div>

        {/* Transaction history skeleton */}
        <div className='mt-12 flex w-full flex-1 flex-col p-4 md:mx-auto md:max-w-[500px]'>
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className='flex flex-row items-center gap-4 py-3'>
                <UiSkeleton className='size-[48px] rounded-full' />
                <div className='flex flex-1 flex-col gap-2'>
                  <UiSkeleton className='h-4 w-[120px]' />
                  <UiSkeleton className='h-4 w-[80px]' />
                </div>
                <UiSkeleton className='size-6 rounded-full' />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
