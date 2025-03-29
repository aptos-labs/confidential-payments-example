'use client'

import { time } from '@distributedlab/tools'
import { formatUnits, parseUnits } from 'ethers'
import { useCallback, useMemo } from 'react'
import { Controller } from 'react-hook-form'

import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler, tryCatch } from '@/helpers'
import { useForm } from '@/hooks'
import { TokenBaseInfo } from '@/store/wallet'
import { UiButton } from '@/ui/UiButton'
import { UiInput } from '@/ui/UiInput'
import { UiSeparator } from '@/ui/UiSeparator'

export default function WithdrawForm({
  token,
  onSubmit,
}: {
  token: TokenBaseInfo
  onSubmit: () => void
}) {
  const {
    withdraw,
    loadSelectedDecryptionKeyState,
    addTxHistoryItem,
    reloadAptBalance,
    perTokenStatuses,
    rolloverAccount,
  } = useConfidentialCoinContext()

  const currentTokenStatus = perTokenStatuses[token.address]

  const pendingAmountBN = BigInt(currentTokenStatus.pendingAmount || 0)

  const actualAmountBN = BigInt(currentTokenStatus?.actualAmount || 0)

  const amountsSumBN = useMemo(() => {
    return pendingAmountBN + actualAmountBN
  }, [actualAmountBN, pendingAmountBN])

  const {
    isFormDisabled,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
  } = useForm(
    {
      amount: '',
    },
    yup =>
      yup.object().shape({
        amount: yup
          .number()
          .max(amountsSumBN ? +formatUnits(amountsSumBN, token.decimals) : 0)
          .required('Enter amount'),
      }),
  )

  const clearForm = useCallback(() => {
    setValue('amount', '')
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()

        const formAmountBN = parseUnits(String(formData.amount), token.decimals)

        if (actualAmountBN < formAmountBN) {
          const [rolloverTxs, rolloverError] = await tryCatch(rolloverAccount())
          if (rolloverError) {
            ErrorHandler.process(rolloverError)
            enableForm()
            return
          }

          rolloverTxs.forEach(el => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (el.payload.function.includes('rollover')) {
              addTxHistoryItem({
                txHash: el.hash,
                txType: 'rollover',
                createdAt: time().timestamp,
              })

              return
            }

            addTxHistoryItem({
              txHash: el.hash,
              txType: 'normalize',
              createdAt: time().timestamp,
            })
          })
        }

        const [withdrawTx, withdrawError] = await tryCatch(
          withdraw(
            parseUnits(String(formData.amount), token.decimals).toString(),
            {
              isSyncFirst: true,
            },
          ),
        )
        if (withdrawError) {
          ErrorHandler.process(withdrawError)
          enableForm()
          return
        }

        addTxHistoryItem({
          txHash: withdrawTx.hash,
          txType: 'withdraw',
          createdAt: time().timestamp,
        })

        const [, reloadError] = await tryCatch(
          Promise.all([loadSelectedDecryptionKeyState(), reloadAptBalance()]),
        )
        if (reloadError) {
          ErrorHandler.process(reloadError)
          enableForm()
          return
        }

        onSubmit()
        clearForm()
        enableForm()
      })(),
    [
      actualAmountBN,
      addTxHistoryItem,
      clearForm,
      disableForm,
      enableForm,
      handleSubmit,
      loadSelectedDecryptionKeyState,
      onSubmit,
      reloadAptBalance,
      rolloverAccount,
      token.decimals,
      withdraw,
    ],
  )

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col justify-between gap-4'>
        <Controller
          control={control}
          name={'amount'}
          render={({ field }) => (
            <UiInput
              {...field}
              placeholder='Enter amount'
              type='number'
              disabled={isFormDisabled}
            />
          )}
        />
      </div>

      <div className='pt-4'>
        <UiSeparator className='mb-4' />
        <UiButton className='w-full' onClick={submit} disabled={isFormDisabled}>
          Withdraw
        </UiButton>
      </div>
    </div>
  )
}
