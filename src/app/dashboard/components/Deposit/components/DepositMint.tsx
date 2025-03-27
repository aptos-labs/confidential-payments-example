import { APTOS_FA } from '@lukachi/aptos-labs-ts-sdk'
import { useState } from 'react'

import { getModuleMockedTokenAddr } from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler } from '@/helpers'
import { useLoading } from '@/hooks'
import { UiButton } from '@/ui/UiButton'
import { UiSkeleton } from '@/ui/UiSkeleton'

export default function DepositMint({ onSubmit }: { onSubmit?: () => void }) {
  const { selectedToken, testMintTokens } = useConfidentialCoinContext()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: { moduleMockedTokenAddr },
    isLoading,
  } = useLoading(
    {
      moduleMockedTokenAddr: '',
    },
    async () => {
      const moduleMockedTokenAddr = await getModuleMockedTokenAddr()

      return {
        moduleMockedTokenAddr,
      }
    },
  )

  const isCurrTokenIsModuleMockedOne =
    moduleMockedTokenAddr === selectedToken?.address

  const isAptosFA = selectedToken?.address === APTOS_FA

  const tryTestMintTokens = async () => {
    setIsSubmitting(true)
    try {
      await testMintTokens()
      onSubmit?.()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }

  return (
    <div className='flex w-full flex-col gap-3 rounded-2xl border-2 border-solid border-textPrimary p-4'>
      {(() => {
        if (isLoading) {
          return <UiSkeleton className='min-h-[36px] w-full' />
        }

        if (isCurrTokenIsModuleMockedOne) {
          return (
            <>
              <span className='text-textPrimary typography-caption2'>
                Mint tokens from the faucet to use within the application.
                Ensure you have sufficient permissions to access the feature.
              </span>

              <UiButton
                className='w-full'
                onClick={tryTestMintTokens}
                disabled={isSubmitting}
              >
                Buy
              </UiButton>
            </>
          )
        }

        if (isAptosFA) {
          return (
            <>
              <span className='text-textPrimary typography-caption2'>
                This is an Aptos Fungible Asset, you can get them in aptos
                faucets or by trading with other users.
              </span>
            </>
          )
        }

        return <></>
      })()}
    </div>
  )
}
