import { time } from '@distributedlab/tools'
import { APTOS_FA } from '@lukachi/aptos-labs-ts-sdk'
import { FixedNumber, parseUnits } from 'ethers'
import { useState } from 'react'

import { getFABalance, mintAptCoin } from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { USDC_MOCKED_TOKEN_ADDR } from '@/config'
import { bus, BusEvents, ErrorHandler, sleep, tryCatch } from '@/helpers'
import { useLoading } from '@/hooks'
import { UiButton } from '@/ui/UiButton'
import { UiSkeleton } from '@/ui/UiSkeleton'

const MINT_AMOUNT = 1

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
    perTokenStatuses,
  } = useConfidentialCoinContext()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const currTokenStatus = perTokenStatuses[selectedToken?.address]

  const isRegistered = currTokenStatus?.isRegistered

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
        moduleMockedTokenAddr: USDC_MOCKED_TOKEN_ADDR,
      }
    },
  )

  const isCurrTokenIsModuleMockedOne =
    moduleMockedTokenAddr?.toLowerCase() ===
    selectedToken?.address.toLowerCase()

  const isAptosFA = selectedToken?.address === APTOS_FA

  const tryTestMintTokens = async () => {
    setIsSubmitting(true)
    try {
      await testMintTokens(`${MINT_AMOUNT}`)
      onSubmit?.()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }

  const tryFundAptBalance = async () => {
    setIsSubmitting(true)
    const amountToDeposit = parseUnits(`${MINT_AMOUNT}`, selectedToken.decimals)

    let mintAttempts = 0

    do {
      const [, mintError] = await tryCatch(
        mintAptCoin(selectedAccount, amountToDeposit),
      )
      if (mintError) {
        if (mintAttempts >= 5) {
          ErrorHandler.process(mintError)
          setIsSubmitting(false)
          return
        }

        mintAttempts += 1
        await sleep(200)
        continue
      }

      break
    } while (mintAttempts < 5)

    if (isRegistered) {
      let depositAttempts = 0

      do {
        const [faOnlyBalanceResponse, getFAError] = await tryCatch(
          getFABalance(selectedAccount, selectedToken.address),
        )
        if (getFAError) {
          if (depositAttempts >= 5) {
            ErrorHandler.process(getFAError)
            setIsSubmitting(false)
            return
          }

          depositAttempts += 1
          await sleep(200)
          continue
        }

        const [faOnlyBalance] = faOnlyBalanceResponse

        const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
          faOnlyBalance?.amount || '0',
        ).lt(FixedNumber.fromValue(amountToDeposit))

        const [depositTxReceipt, depositError] = await tryCatch(
          isInsufficientFAOnlyBalance
            ? depositCoinTo(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              )
            : depositTo(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              ),
        )
        if (depositError) {
          if (depositAttempts >= 5) {
            ErrorHandler.process(depositError)
            setIsSubmitting(false)
            return
          }

          depositAttempts += 1
          await sleep(200)
          continue
        }

        addTxHistoryItem({
          txHash: depositTxReceipt.hash,
          txType: 'deposit',
          createdAt: time().timestamp,
          message: `Gifted ${MINT_AMOUNT} ${selectedToken.symbol} from the faucet`,
        })

        await Promise.all([
          reloadAptBalance(),
          loadSelectedDecryptionKeyState(),
        ])
        bus.emit(
          BusEvents.Success,
          isRegistered
            ? 'Successfully funded your balance with 1 APT'
            : 'Successfully funded your public balance with 1 APT',
        )
        setIsSubmitting(false)
        onSubmit?.()

        break
      } while (depositAttempts < 5)
    }
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
              <UiButton
                className='w-full'
                onClick={tryTestMintTokens}
                disabled={isSubmitting}
              >
                Get {MINT_AMOUNT} free {selectedToken?.symbol} tokens!
              </UiButton>
            </>
          )
        }

        if (isAptosFA) {
          return (
            <>
              <UiButton
                className='w-full'
                onClick={tryFundAptBalance}
                disabled={isSubmitting}
              >
                Get {MINT_AMOUNT} free {selectedToken?.symbol} tokens!
              </UiButton>
            </>
          )
        }

        return <></>
      })()}
    </div>
  )
}
