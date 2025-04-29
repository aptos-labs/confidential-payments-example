import { HTMLAttributes } from 'react'

import { cn } from '@/theme/utils'

type Props = HTMLAttributes<HTMLDivElement>

export default function UiContainer({ ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(rest.className, 'mx-auto max-w-[1128px] px-4', 'xl:px-0')}
    />
  )
}
