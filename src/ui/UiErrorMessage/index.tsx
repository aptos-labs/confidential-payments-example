import './styles.scss'

import { HTMLAttributes } from 'react'

import { IconNames } from '@/enums'
import { UiIcon } from '@/ui'

interface Props extends HTMLAttributes<HTMLDivElement> {
  title?: string
  message: string
  iconName?: IconNames
}

export default function UiErrorMessage({
  title,
  message,
  iconName = IconNames.ExclamationCircle,
  className = '',
  ...rest
}: Props) {
  return (
    <div className={`ui-error-message ${className}`} {...rest}>
      <UiIcon className='ui-error-message__img' name={iconName} />
      {title ? <h3 className='ui-error-message__title'>{title}</h3> : <></>}
      <p className='ui-error-message__message'>{message}</p>
    </div>
  )
}
