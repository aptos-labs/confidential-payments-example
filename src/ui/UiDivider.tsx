import { HTMLAttributes } from 'react'

import { cn } from '@/theme/utils'

export default function UiDivider(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('h-[1px] w-full bg-componentPrimary', props.className)}
    />
  )
}
