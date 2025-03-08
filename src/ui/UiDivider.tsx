import { HTMLAttributes } from 'react'

import { cn } from '@/theme/utils'

export default function UiDivider(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn('bg-componentPrimary h-[1px] w-full', props.className)}
    />
  )
}
