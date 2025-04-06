'use client'

import Avatar from 'boring-avatars'
import Image from 'next/image'
import { HTMLAttributes, useMemo } from 'react'

import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'

export default function TokenInfo({
  token,
}: { token: TokenBaseInfo } & HTMLAttributes<HTMLDivElement>) {
  const tokenIconComponent = useMemo(() => {
    try {
      const tokenImgUrl = new URL(token.iconUri)

      return token.iconUri ? (
        <Image
          src={tokenImgUrl.href}
          alt={token.name}
          width={75}
          height={75}
          className='size-[75] rounded-full'
        />
      ) : (
        <Avatar name={token.address} size={75} variant='pixel' />
      )
    } catch (error) {
      /* empty */
    }

    return <Avatar name={token.address} size={75} variant='pixel' />
  }, [token.address, token.iconUri, token.name])

  return (
    <div className='mt-3 flex flex-col gap-3'>
      {tokenIconComponent}
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
      <span className='typography-caption2 uppercase text-textPrimary'>
        {label}
      </span>
      <span className='typography-body2 text-right text-textPrimary'>
        {value}
      </span>
    </div>
  )
}
