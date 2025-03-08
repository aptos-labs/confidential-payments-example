import { config } from '@config'
import { HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

import { RoutePaths } from '@/enums'
import { cn } from '@/theme/utils'

export default function UiLogo({ ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('relative flex flex-col', rest.className)}>
      <img
        className={cn('w-[120px]')}
        src='/branding/logo.svg'
        alt={config.APP_NAME}
      />
      <Link
        className='absolute left-0 top-0 h-full w-full'
        to={RoutePaths.Root}
      />
    </div>
  )
}
