import { HTMLAttributes } from 'react'

import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'

export default function TokenInfo({
  token,
}: { token: TokenBaseInfo } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className='mt-3 flex flex-col gap-3'>
      {token.iconUri && (
        <img
          src={token.iconUri}
          alt={token.name}
          className='size-[75] rounded-full'
        />
      )}
      <TokenInfoItem label='Name' value={token.name} />
      <TokenInfoItem label='Symbol' value={token.symbol} />
      <TokenInfoItem label='Decimals' value={String(token.decimals)} />
    </div>
  )
}

function TokenInfoItem({
  label,
  value,
  className,
  ...rest
}: { label: string; value: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('flex items-center justify-between', className)}
    >
      <span className='uppercase text-textPrimary typography-caption2'>
        {label}
      </span>
      <span className='text-right text-textPrimary typography-body2'>
        {value}
      </span>
    </div>
  )
}
