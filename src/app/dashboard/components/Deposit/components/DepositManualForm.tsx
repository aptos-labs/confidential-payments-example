'use client'

import { time } from '@distributedlab/tools'
import { FixedNumber, parseUnits } from 'ethers'
import { useCallback, useState } from 'react'

import { getFABalance } from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, formatBalance } from '@/helpers'
import { useForm } from '@/hooks'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import { ControlledUiInput } from '@/ui/UiInput'
import { UiLabel } from '@/ui/UiLabel'
import { UiSwitch } from '@/ui/UiSwitch'
import {
  UiTooltip,
  UiTooltipContent,
  UiTooltipProvider,
  UiTooltipTrigger,
} from '@/ui/UiTooltip'

export default function DepositManualForm({
  onSubmit,
}: {
  onSubmit?: () => void
}) {
  const {
    selectedAccount,
    selectedToken,
    depositTo,
    depositCoinTo,
    addTxHistoryItem,
    perTokenStatuses,
  } = useConfidentialCoinContext()

  const [isOtherRecipient, setIsOtherRecipient] = useState(false)

  const formattedTotalBalance = formatBalance(
    perTokenStatuses[selectedToken.address].fungibleAssetBalance,
    selectedToken.decimals,
  )

  const { control, disableForm, enableForm, isFormDisabled, handleSubmit } =
    useForm(
      { recipient: selectedAccount.accountAddress.toString(), amount: '' },
      yup =>
        yup.object().shape({
          amount: yup.number().max(+formattedTotalBalance).required(),
          recipient: yup.string().required(),
        }),
    )

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          const amountToDeposit = parseUnits(
            String(formData.amount),
            selectedToken.decimals,
          )

          const [faOnlyBalance] = await getFABalance(
            selectedAccount,
            selectedToken.address,
          )

          const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
            faOnlyBalance?.amount || '0',
          ).lt(FixedNumber.fromValue(amountToDeposit))

          const depositTxReceipt = isInsufficientFAOnlyBalance
            ? await depositCoinTo(amountToDeposit, formData.recipient)
            : await depositTo(amountToDeposit, formData.recipient)

          addTxHistoryItem({
            txHash: depositTxReceipt.hash,
            txType: 'deposit',
            createdAt: time().timestamp,
          })

          onSubmit?.()
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [
      addTxHistoryItem,
      depositCoinTo,
      depositTo,
      disableForm,
      enableForm,
      handleSubmit,
      onSubmit,
      selectedAccount,
      selectedToken.address,
      selectedToken.decimals,
    ],
  )

  return (
    <form className='flex flex-col gap-3' onSubmit={handleSubmit(submit)}>
      {isOtherRecipient && (
        <ControlledUiInput
          control={control}
          name='recipient'
          label='Recipient'
          placeholder='recipient'
        />
      )}
      <ControlledUiInput
        control={control}
        name='amount'
        placeholder='amount'
        type='number'
        label={
          isOtherRecipient ? (
            'Amount'
          ) : (
            <UiTooltipProvider delayDuration={0}>
              <UiTooltip>
                <UiTooltipTrigger>
                  <div className='typography-caption2 flex items-center gap-2 text-textPrimary'>
                    Amount
                    <UiIcon
                      name='InfoIcon'
                      className='size-4 text-textPrimary'
                    />
                  </div>
                </UiTooltipTrigger>
                <UiTooltipContent className='max-w-[75vw]'>
                  Manual deposit from you Fungible Asset balance to Confidential
                  balance
                </UiTooltipContent>
              </UiTooltip>
            </UiTooltipProvider>
          )
        }
      />
      <div className='flex w-full justify-end'>
        <span className='typography-caption3 text-textPrimary'>
          Current public balance:
          <span className='typography-caption1 ml-2 text-textPrimary'>
            {formattedTotalBalance}
          </span>
          <span className='typography-caption1 ml-2 uppercase text-textPrimary'>
            {selectedToken.symbol}
          </span>
        </span>
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center justify-end gap-3'>
          <UiLabel htmlFor='deposit-check'>Other recipient</UiLabel>
          <UiSwitch
            checked={isOtherRecipient}
            onCheckedChange={v => setIsOtherRecipient(v)}
          />
        </div>
      </div>

      <UiButton
        className='mt-4 w-full'
        onClick={submit}
        disabled={isFormDisabled}
      >
        Deposit
      </UiButton>
    </form>
  )
}
