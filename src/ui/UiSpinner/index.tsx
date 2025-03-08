import './styles.scss'

import { HTMLAttributes } from 'react'

export default function UiSpinner({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={['ui-spinner', className].join(' ')} {...rest} />
}
