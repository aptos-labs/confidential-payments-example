'use client'

import Avatar from 'boring-avatars'
import { Check, Copy } from 'lucide-react'
import { HTMLAttributes, useState } from 'react'

import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, formatBalance } from '@/helpers'
import { useCopyToClipboard } from '@/hooks'
import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'
import { UiButton } from '@/ui/UiButton'
import { UiSkeleton } from '@/ui/UiSkeleton'

export default function ConfidentialAssetCard({
  token,
  // encryptionKey,
  actualAmount,

  isLoading,

  /* eslint-disable unused-imports/no-unused-vars */
  isNormalized,
  isFrozen,
  isRegistered,

  className,

  ...rest
}: {
  isLoading: boolean

  token: TokenBaseInfo

  actualAmount: string

  isNormalized: boolean
  isFrozen: boolean
  isRegistered: boolean
} & HTMLAttributes<HTMLDivElement>) {
  const {
    registerAccountEncryptionKey,
    reloadAptBalance,
    loadSelectedDecryptionKeyState,
  } = useConfidentialCoinContext()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const tryRegister = async () => {
    setIsSubmitting(true)
    try {
      await registerAccountEncryptionKey(token.address)
      await Promise.all([loadSelectedDecryptionKeyState(), reloadAptBalance()])
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }

  const { copy, isCopied } = useCopyToClipboard()

  return (
    <div {...rest} className={cn('relative overflow-hidden', className)}>
      <div className={cn('relative isolate')}>
        <div className='flex size-full flex-col items-center gap-4 rounded-2xl p-4'>
          {/*{VBStatusContent}*/}

          <div className='relative flex items-center gap-2'>
            <Avatar name={token.address} size={20} variant='pixel' />

            <span className='text-textPrimary typography-subtitle1'>
              {token.name}
            </span>

            <button
              className='absolute left-full top-1/2 -translate-y-1/2'
              onClick={() => copy(token.address)}
            >
              {isCopied ? (
                <Check size={24} className={'pl-2 text-textSecondary'} />
              ) : (
                <Copy size={24} className={'pl-2 text-textSecondary'} />
              )}
            </button>
          </div>

          <div className='flex items-center'>
            <div className='flex items-end gap-1'>
              <div className='text-textPrimary typography-h2'>
                {formatBalance(actualAmount, token.decimals)}
              </div>
              <span className='-translate-y-[7px] text-textSecondary typography-subtitle2'>
                {token.symbol}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'absolute-center size-full w-[50%] rounded-md border border-gray-100 bg-gray-900 bg-opacity-60 bg-clip-padding backdrop-blur-sm backdrop-filter',
          isRegistered ? 'hidden' : 'flex',
        )}
      >
        {isLoading ? (
          <UiSkeleton className='absolute-center size-[95%]' />
        ) : (
          <UiButton
            className='absolute-center min-w-[300px]'
            onClick={tryRegister}
            disabled={isSubmitting}
          >
            Start
          </UiButton>
        )}
      </div>
    </div>
  )
}
