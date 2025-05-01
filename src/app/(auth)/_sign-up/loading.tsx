import { cn } from '@/theme/utils';
import { UiCard, UiCardContent } from '@/ui/UiCard';
import { UiSkeleton } from '@/ui/UiSkeleton';

export default function Loading() {
  return (
    <div className='flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10'>
      <div className='w-full max-w-sm md:max-w-3xl'>
        <div className={cn('flex flex-col gap-6')}>
          <UiCard className='overflow-hidden'>
            <UiCardContent className='grid gap-2 p-4 md:grid-cols-2'>
              <UiSkeleton className='min-h-[400px]' />
              <div className='relative hidden bg-muted md:block'>
                <UiSkeleton />
              </div>
            </UiCardContent>
          </UiCard>
        </div>
      </div>
    </div>
  );
}
