'use client';

import dynamic from 'next/dynamic';

const HomepageLinkContent = dynamic(
  () => import('@/app/_components/HomepageLinkContent'),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-10 w-32 items-center justify-center rounded-full bg-backgroundPrimary text-textPrimary'>
        Loading...
      </div>
    ),
  },
);

export default function HomepageLink() {
  return <HomepageLinkContent />;
}
