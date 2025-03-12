import { time } from '@distributedlab/tools'
import { parseUnits } from 'ethers'
import { motion } from 'motion/react'
import { HTMLAttributes, useCallback } from 'react'
import { Control, Controller, useFieldArray } from 'react-hook-form'

import { validateEncryptionKeyHex } from '@/api/modules/aptos'
import { ErrorHandler } from '@/helpers'
import { useForm } from '@/hooks'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'
import { UiIcon } from '@/ui'
import { UiButton } from '@/ui/UiButton'
import { UiInput } from '@/ui/UiInput'
import { UiSeparator } from '@/ui/UiSeparator'

export default function TransferForm({
  token,
  onSubmit,
}: {
  token: TokenBaseInfo
  onSubmit: () => void
}) {
  const {
    transfer,
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
      receiverEncryptionKey: '',
      amount: '',
      auditorsEncryptionKeysHex: [] as string[],
    },
    yup =>
      yup.object().shape({
        receiverEncryptionKey: yup.string().required('Enter receiver'),
        amount: yup.number().required('Enter amount'),
        auditorsEncryptionKeysHex: yup.array().of(
          yup.string().test('Invalid encryption key', v => {
            if (!v) return false

            return validateEncryptionKeyHex(v)
          }),
        ),
      }),
  )

  const clearForm = useCallback(() => {
    setValue('receiverEncryptionKey', '')
    setValue('amount', '')
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          const txReceipt = await transfer(
            formData.receiverEncryptionKey,
            parseUnits(formData.amount, token.decimals).toString(),
            formData.auditorsEncryptionKeysHex,
          )
          addTxHistoryItem({
            txHash: txReceipt.hash,
            txType: 'transfer',
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
      transfer,
    ],
  )

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col gap-4'>
        <Controller
          control={control}
          name='receiverEncryptionKey'
          render={({ field }) => (
            <UiInput
              {...field}
              placeholder='Enter encryption key'
              disabled={isFormDisabled}
            />
          )}
        />

        <Controller
          control={control}
          name='amount'
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

      <AuditorsList
        className='mt-3 flex-1 rounded-3xl bg-backgroundPure p-4 shadow-md'
        control={control}
      />

      <div className='mt-auto pt-4'>
        <UiSeparator className='mb-4' />
        <UiButton
          className='transition-all duration-200'
          onClick={submit}
          disabled={isFormDisabled}
        >
          Send
        </UiButton>
      </div>
    </div>
  )
}

const AuditorsList = ({
  control,
  ...rest
}: {
  control: Control<{
    receiverEncryptionKey: string
    amount: string
    auditorsEncryptionKeysHex: string[]
  }>
} & HTMLAttributes<HTMLDivElement>) => {
  const { fields, append, remove } = useFieldArray({
    control: control!,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    name: 'auditorsEncryptionKeysHex',
  })

  const addAuditor = () => {
    append('')
  }

  const removeAuditor = (index: number) => {
    remove(index)
  }

  return (
    <div {...rest} className={cn('flex flex-col gap-2', rest.className)}>
      <span className='uppercase text-textPrimary typography-caption2'>
        Add auditors
      </span>

      <div className='flex flex-col gap-3'>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className='flex min-h-[60] flex-col items-center gap-2 bg-backgroundPure'
          >
            <Controller
              control={control}
              name={`auditorsEncryptionKeysHex.${index}`}
              render={({ field }) => (
                <UiInput {...field} placeholder={`Auditor ${index + 1}`} />
              )}
            />
            <motion.div>
              <div className='flex h-full flex-row items-center'>
                <button
                  className='flex min-w-[60] flex-col items-center justify-center self-stretch bg-errorMain'
                  onClick={() => removeAuditor(index)}
                >
                  <UiIcon name={'Trash'} size={24} className='text-baseWhite' />
                </button>
              </div>
            </motion.div>
          </div>
        ))}
        <UiButton onClick={addAuditor} className='mt-3'>
          Add Auditor
        </UiButton>
      </div>
    </div>
  )
}
