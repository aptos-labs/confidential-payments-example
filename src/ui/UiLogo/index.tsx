import Image from 'next/image';
import { HTMLAttributes } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/theme/utils';

export default function UiLogo({ ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('relative flex flex-col', rest.className)}>
      <Image className={cn('w-[120px]')} src='/branding/logo.svg' alt={''} />
      <Link className='absolute left-0 top-0 h-full w-full' to={'/dashboard'} />
    </div>
  );
}
