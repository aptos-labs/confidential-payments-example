import { time } from '@distributedlab/tools'
import { parseUnits } from 'ethers'
import { useCallback } from 'react'
import { Controller } from 'react-hook-form'

import { ErrorHandler } from '@/helpers'
import { useForm } from '@/hooks'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
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
  } = useConfidentialCoinContext()

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
        amount: yup.number().required('Enter amount'),
      }),
  )

  const clearForm = useCallback(() => {
    setValue('amount', '')
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          const txReceipt = await withdraw(
            parseUnits(formData.amount, token.decimals).toString(),
          )
          addTxHistoryItem({
            txHash: txReceipt.hash,
            txType: 'withdraw',
            createdAt: time().timestamp,
          })

          await Promise.all([
            loadSelectedDecryptionKeyState(),
            reloadAptBalance(),
          ])

          onSubmit()
          clearForm()
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [
      addTxHistoryItem,
      clearForm,
      disableForm,
      enableForm,
      handleSubmit,
      loadSelectedDecryptionKeyState,
      onSubmit,
      reloadAptBalance,
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
              type='decimal'
              disabled={isFormDisabled}
            />
          )}
        />
      </div>

      <div className='mt-[100] pt-4'>
        <UiSeparator className='mb-4' />
        <UiButton onClick={submit} disabled={isFormDisabled}>
          Withdraw
        </UiButton>
      </div>
    </div>
  )
}
