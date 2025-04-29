import './styles.scss'

import { HTMLAttributes } from 'react'

import { IconNames } from '@/enums'
import { UiIcon } from '@/ui'

interface Props extends HTMLAttributes<HTMLDivElement> {
  message: string
  iconName?: IconNames
}

export default function UiNoDataMessage({
  message,
  iconName = IconNames.Archive,
  className = '',
  ...rest
}: Props) {
  return (
    <div className={`ui-no-data-message ${className}`} {...rest}>
      <UiIcon className='ui-no-data-message__img' name={iconName} />
      <span className='ui-no-data-message__message'>{message}</span>
    </div>
  )
}
