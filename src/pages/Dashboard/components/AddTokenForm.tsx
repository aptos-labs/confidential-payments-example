import { useCallback, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useDebounce } from 'react-use'

import {
  getFungibleAssetMetadata,
  validateEncryptionKeyHex,
} from '@/api/modules/aptos'
import { ErrorHandler } from '@/helpers'
import { useForm } from '@/hooks'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
import { TokenBaseInfo } from '@/store/wallet'
import { UiButton } from '@/ui/UiButton'
import { UiInput } from '@/ui/UiInput'

export default function AddTokenForm({ onSubmit }: { onSubmit: () => void }) {
  const { addToken } = useConfidentialCoinContext()

  const {
    formState,
    isFormDisabled,
    handleSubmit,
    disableForm,
    enableForm,
    control,
    setValue,
  } = useForm(
    {
      tokenAddress: '',
      tokenInfo: undefined as TokenBaseInfo | undefined,
    },
    yup =>
      yup.object().shape({
        tokenAddress: yup.string().test('Invalid token address', v => {
          if (!v) return false

          return validateEncryptionKeyHex(v)
        }),
        tokenInfo: yup.object().shape({
          address: yup.string().required(),
        }),
      }),
  )

  const [isSearching, setIsSearching] = useState(false)

  const isDisabled = isSearching || isFormDisabled

  const clearForm = useCallback(() => {
    setValue('tokenAddress', '')
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          addToken(formData.tokenInfo!)
          onSubmit()
          clearForm()
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [addToken, clearForm, disableForm, enableForm, handleSubmit, onSubmit],
  )

  const searchToken = useCallback(
    async (tokenAddress: string) => {
      setIsSearching(true)

      try {
        const token = await getFungibleAssetMetadata(tokenAddress)

        setValue('tokenInfo', token)
      } catch (error) {
        return undefined
      }
      setIsSearching(false)
    },
    [setValue],
  )

  const renderTokenInfoItem = useCallback((label: string, value: string) => {
    return (
      <div className='flex flex-row items-center justify-between'>
        <span className='uppercase text-textPrimary typography-caption2'>
          {label}
        </span>
        <span className='text-right text-textPrimary typography-body2'>
          {value}
        </span>
      </div>
    )
  }, [])

  useDebounce(
    async () => {
      if (!formState.tokenAddress) return

      await searchToken(formState.tokenAddress)
    },
    500,
    [formState.tokenAddress],
  )

  return (
    <div className='flex-1'>
      <Controller
        control={control}
        name={'tokenAddress'}
        render={({ field }) => (
          <UiInput {...field} placeholder='Enter token address' />
        )}
      />

      {formState.tokenInfo && (
        <div className='mt-3 flex gap-3'>
          {formState.tokenInfo.iconUri && (
            <img
              src={formState.tokenInfo.iconUri}
              alt={formState.tokenInfo.name}
              className='size-[75] rounded-full'
            />
          )}
          {renderTokenInfoItem('Name', formState.tokenInfo.name)}
          {renderTokenInfoItem('Symbol', formState.tokenInfo.symbol)}
          {renderTokenInfoItem(
            'Decimals',
            String(formState.tokenInfo.decimals),
          )}
        </div>
      )}
      <div className='mt-auto pt-4'>
        <UiButton className='w-full' onClick={submit} disabled={isDisabled}>
          Add
        </UiButton>
      </div>
    </div>
  )
}
