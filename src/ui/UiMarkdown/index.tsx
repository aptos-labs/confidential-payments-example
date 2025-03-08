import './styles.scss'

import { HTMLAttributes } from 'react'
import Markdown from 'react-markdown'

import { cn } from '@/theme/utils'

type Props = {
  source: string
} & HTMLAttributes<HTMLDivElement>

export default function UiMarkdown({ source, ...rest }: Props) {
  return (
    <div {...rest} className={cn(rest.className, 'ui-markdown')}>
      <Markdown>{source}</Markdown>
    </div>
  )
}
