import { HTMLAttributes } from 'react'
import { NavLink } from 'react-router-dom'

import { IconNames } from '@/enums'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'

type Props = HTMLAttributes<HTMLDivElement> &
  (
    | {
        route?: string
        href?: never
      }
    | {
        route?: never
        href?: string
      }
  )

const ROOT_CLASS_NAMES = cn(
  'flex justify-center leading-[normal] not-italic gap-2 text-[color:var(--text-primary-main)] w-max text-5 font-normal underline',
)

export default function UiIconLink({ route, href, children, ...rest }: Props) {
  const innerContent = (
    <>
      <span>{children}</span>
      <UiIcon
        className={cn('size-5 text-inherit')}
        name={IconNames.ExternalLink}
      />
    </>
  )

  if (route) {
    return (
      <NavLink className={cn(rest.className, ROOT_CLASS_NAMES)} to={route}>
        {innerContent}
      </NavLink>
    )
  }

  return (
    <a
      className={cn(rest.className, ROOT_CLASS_NAMES)}
      href={href}
      target='_blank'
      rel='noreferrer'
    >
      {innerContent}
    </a>
  )
}
