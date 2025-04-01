import { time } from '@distributedlab/tools'
import { APTOS_FA } from '@lukachi/aptos-labs-ts-sdk'
import { FixedNumber, parseUnits } from 'ethers'
import { useState } from 'react'

import { getFABalance, mintAptCoin } from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { config } from '@/config'
import { bus, BusEvents, ErrorHandler, tryCatch } from '@/helpers'
import { useLoading } from '@/hooks'
import { UiButton } from '@/ui/UiButton'
import { UiSkeleton } from '@/ui/UiSkeleton'

export default function DepositMint({ onSubmit }: { onSubmit?: () => void }) {
  const {
    selectedAccount,
    selectedToken,
    depositTo,
    depositCoinTo,
    testMintTokens,
    reloadAptBalance,
    loadSelectedDecryptionKeyState,
    addTxHistoryItem,
  } = useConfidentialCoinContext()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    data: { moduleMockedTokenAddr },
    isLoading,
  } = useLoading(
    {
      moduleMockedTokenAddr: '',
    },
    async () => {
      // TODO: rollback once mocked token and module token are ready
      // const moduleMockedTokenAddr = await getModuleMockedTokenAddr()

      return {
        moduleMockedTokenAddr: config.DEFAULT_TOKEN_ADRESSES[1],
      }
    },
  )

  const isCurrTokenIsModuleMockedOne =
    moduleMockedTokenAddr.toLowerCase() === selectedToken?.address.toLowerCase()

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

  const tryFundAptBalance = async () => {
    setIsSubmitting(true)
    const amountToDeposit = parseUnits('1', selectedToken.decimals)

    const [, mintError] = await tryCatch(
      mintAptCoin(selectedAccount, amountToDeposit),
    )
    if (mintError) {
      ErrorHandler.processWithoutFeedback(mintError)
      setIsSubmitting(false)
      return
    }

    const [faOnlyBalance] = await getFABalance(
      selectedAccount,
      selectedToken.address,
    )

    const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
      faOnlyBalance?.amount || '0',
    ).lt(FixedNumber.fromValue(amountToDeposit))

    const [depositTxReceipt, depositError] = await tryCatch(
      isInsufficientFAOnlyBalance
        ? depositCoinTo(
            amountToDeposit,
            selectedAccount.accountAddress.toString(),
          )
        : depositTo(amountToDeposit, selectedAccount.accountAddress.toString()),
    )
    if (depositError) {
      ErrorHandler.processWithoutFeedback(depositError)
      setIsSubmitting(false)
      return
    }

    addTxHistoryItem({
      txHash: depositTxReceipt.hash,
      txType: 'deposit',
      createdAt: time().timestamp,
    })

    await Promise.all([reloadAptBalance(), loadSelectedDecryptionKeyState()])
    bus.emit(BusEvents.Success, 'Successfully funded your balance with 1 APT')
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
              <span className='typography-caption2 text-textPrimary'>
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
              <span className='typography-caption2 text-textPrimary'>
                This is an Aptos Fungible Asset, you can get them in aptos
                faucets or by trading with other users.
              </span>

              <UiButton
                className='w-full'
                onClick={tryFundAptBalance}
                disabled={isSubmitting}
              >
                Buy
              </UiButton>
            </>
          )
        }

        return <></>
      })()}
    </div>
  )
}
