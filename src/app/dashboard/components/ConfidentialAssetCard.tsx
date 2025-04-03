'use client'

import Avatar from 'boring-avatars'
import { HTMLAttributes, useMemo, useState } from 'react'

import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, formatBalance } from '@/helpers'
import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import {
  UiTooltip,
  UiTooltipContent,
  UiTooltipProvider,
  UiTooltipTrigger,
} from '@/ui/UiTooltip'

export default function ConfidentialAssetCard({
  token,
  // encryptionKey,
  pendingAmount,
  actualAmount,

  /* eslint-disable unused-imports/no-unused-vars */
  isNormalized,
  isFrozen,
  isRegistered,

  className,

  ...rest
}: {
  token: TokenBaseInfo

  pendingAmount: string
  actualAmount: string

  isNormalized: boolean
  isFrozen: boolean
  isRegistered: boolean
} & HTMLAttributes<HTMLDivElement>) {
  const {
    registerAccountEncryptionKey,
    reloadAptBalance,
    loadSelectedDecryptionKeyState,
    perTokenStatuses,
  } = useConfidentialCoinContext()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const amountsSumBN = useMemo(() => {
    return (
      BigInt(pendingAmount || 0) +
      BigInt(actualAmount || 0) +
      BigInt(perTokenStatuses[token.address].fungibleAssetBalance || 0)
    )
  }, [actualAmount, pendingAmount, perTokenStatuses, token.address])

  const tryRegister = async () => {
    setIsSubmitting(true)

    const currTokenStatus = perTokenStatuses[token.address]

    try {
      await registerAccountEncryptionKey(token.address)
      await Promise.all([loadSelectedDecryptionKeyState(), reloadAptBalance()])
    } catch (error) {
      if (+currTokenStatus.fungibleAssetBalance >= 0) {
        ErrorHandler.process(
          error,
          'Insufficient APT balance, try funding your account',
        )
      } else {
        ErrorHandler.process(error)
      }
    }
    setIsSubmitting(false)
  }

  return (
    <div {...rest} className={cn('relative overflow-hidden', className)}>
      <div className={cn('relative isolate')}>
        <div className='flex size-full flex-col items-center gap-4 rounded-2xl p-4'>
          <div className='relative flex items-center gap-2'>
            <Avatar name={token.address} size={20} variant='pixel' />

            <span className='typography-subtitle1 text-textPrimary'>
              {token.name}
            </span>

            {/* <button
                  className='absolute left-full top-1/2 -translate-y-1/2'
                  onClick={() => copy(token.address)}
                >
                  {isCopied ? (
                    <Check size={24} className={'pl-2 text-textSecondary'} />
                  ) : (
                    <Copy size={24} className={'pl-2 text-textSecondary'} />
                  )}
                </button> */}
          </div>

          <div className='flex items-center'>
            {isRegistered ? (
              <>
                <div className='flex items-end gap-1'>
                  <div className='typography-h2 text-textPrimary'>
                    {actualAmount &&
                      pendingAmount &&
                      formatBalance(amountsSumBN, token.decimals)}
                  </div>
                  <span className='typography-subtitle2 -translate-y-[7px] text-textSecondary'>
                    {token.symbol}
                  </span>
                </div>
              </>
            ) : (
              <div className='flex flex-col items-center gap-2'>
                <UiButton
                  className='min-w-[300px]'
                  onClick={tryRegister}
                  disabled={isSubmitting}
                >
                  Start
                </UiButton>

                <UiTooltipProvider delayDuration={0}>
                  <UiTooltip>
                    <div className='flex items-center gap-2'>
                      <span className='typography-caption1 text-textPrimary'>
                        Let's register this token as your private balance
                      </span>
                      <UiTooltipTrigger>
                        <UiIcon
                          name='InfoIcon'
                          className='size-4 text-textPrimary'
                        />
                      </UiTooltipTrigger>
                    </div>

                    <UiTooltipContent className='overflow-hidden text-ellipsis'>
                      <span className='typography-caption1 text-textSecondary'>
                        make sure you have anough APT to send transactions, or
                        you can buy some in deposit modal
                      </span>
                    </UiTooltipContent>
                  </UiTooltip>
                </UiTooltipProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
