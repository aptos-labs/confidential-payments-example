import { UiSkeleton } from '@/ui/UiSkeleton'

export default function Loading() {
  return (
    <div className='flex min-h-svh w-full'>
      <div className='flex flex-1 flex-col'>
        <UiSkeleton className='m-4 min-h-[33%]' />
        <div className='mt-4 flex items-center justify-center gap-4'>
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <UiSkeleton key={i} className='size-[48px] rounded-[50%]' />
            ))}
        </div>
        <UiSkeleton className='mt-4 w-full flex-1 rounded-t-2xl bg-backgroundContainer' />
      </div>
    </div>
  )
}
