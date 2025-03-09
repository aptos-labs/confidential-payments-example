import { AnimatePresence } from 'motion/react'
import { HTMLAttributes } from 'react'
import { Outlet } from 'react-router-dom'

import { cn } from '@/theme/utils'

export default function MainLayout({
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(rest.className, 'h-[100dvh] w-[100vw] overflow-x-hidden')}
    >
      <AnimatePresence>
        <Outlet />
      </AnimatePresence>
    </div>
  )
}
