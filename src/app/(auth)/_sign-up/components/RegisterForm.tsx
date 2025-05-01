'use client';

import dynamic from 'next/dynamic';

import { UiSkeleton } from '@/ui/UiSkeleton';

const RegisterFormContent = dynamic(() => import('./RegisterFormContent'), {
  ssr: false,
  loading: () => (
    <div className='p-6 md:p-8'>
      <div className='flex flex-col gap-6'>
        <div className='flex flex-col items-center text-center'>
          <UiSkeleton className='h-8 w-32' />
          <UiSkeleton className='mt-2 h-4 w-48' />
        </div>

        <div className='flex flex-col gap-4'>
          <UiSkeleton className='h-10 w-full' />
          <UiSkeleton className='h-10 w-full' />
          <UiSkeleton className='h-10 w-full' />
          <UiSkeleton className='h-10 w-full' />
        </div>

        <UiSkeleton className='h-10 w-full' />

        <div className='text-center text-sm'>
          <UiSkeleton className='mx-auto h-4 w-48' />
        </div>
      </div>
    </div>
  ),
});

export default function RegisterForm() {
  return <RegisterFormContent />;
}
