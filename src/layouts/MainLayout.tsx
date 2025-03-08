import { AnimatePresence } from 'motion/react'
import { HTMLAttributes } from 'react'
import { Outlet } from 'react-router-dom'

import { cn } from '@/theme/utils'

export default function MainLayout({
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn(rest.className, 'overflow-x-hidden')}>
      <AnimatePresence>
        <Outlet />
      </AnimatePresence>
    </div>
  )
}
