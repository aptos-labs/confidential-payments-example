'use client'

import { time } from '@distributedlab/tools'
import Avatar from 'boring-avatars'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useDebounce } from 'react-use'

import {
  getFungibleAssetMetadata,
  validateEncryptionKeyHex,
} from '@/api/modules/aptos'
import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler } from '@/helpers'
import { useForm } from '@/hooks'
import { TokenBaseInfo } from '@/store/wallet'
import { UiButton } from '@/ui/UiButton'
import { UiInput } from '@/ui/UiInput'

export default function AddTokenForm({ onSubmit }: { onSubmit: () => void }) {
  const {
    addToken,
    registerAccountEncryptionKey,
    addTxHistoryItem,
    setSelectedTokenAddress,
  } = useConfidentialCoinContext()

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
  const [foundedTokens, setFoundedTokens] = useState<TokenBaseInfo[]>([])

  const isDisabled = isSearching || isFormDisabled

  const clearForm = useCallback(() => {
    setValue('tokenAddress', '')
    setValue('tokenInfo', undefined)
    setFoundedTokens([])
  }, [setValue])

  const submit = useCallback(
    () =>
      handleSubmit(async formData => {
        disableForm()
        try {
          try {
            const txReceipt = await registerAccountEncryptionKey(
              formData.tokenAddress,
            )
            addTxHistoryItem({
              txHash: txReceipt.hash,
              txType: 'register',
              createdAt: time().timestamp,
            })
          } catch (error) {
            /* empty */
          }
          addToken(formData.tokenInfo!)
          setSelectedTokenAddress(formData.tokenInfo!.address)
          onSubmit()
          clearForm()
        } catch (error) {
          ErrorHandler.process(error)
        }
        enableForm()
      })(),
    [
      addToken,
      addTxHistoryItem,
      clearForm,
      disableForm,
      enableForm,
      handleSubmit,
      onSubmit,
      registerAccountEncryptionKey,
      setSelectedTokenAddress,
    ],
  )

  const searchToken = useCallback(
    async (tokenAddress: string) => {
      setIsSearching(true)

      try {
        const token = await getFungibleAssetMetadata(tokenAddress)

        setFoundedTokens([token])
        setValue('tokenInfo', token)
      } catch (error) {
        return undefined
      }
      setIsSearching(false)
    },
    [setValue],
  )

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

      <div className='mt-4 flex flex-col gap-4'>
        {foundedTokens.map((el, idx) => (
          <div key={idx} className='mt-3 flex gap-3'>
            {el.iconUri ? (
              <Image
                src={el.iconUri}
                alt={el.name}
                className='size-[48px] rounded-full'
              />
            ) : (
              <Avatar
                name={el.address}
                className={'size-[48px] rounded-[50%]'}
              />
            )}
            <div className='flex flex-col gap-2'>
              <span className='text-textPrimary typography-caption1'>
                {el.name}
              </span>
              <span className='text-textSecondary typography-caption2'>
                {el.symbol}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className='mt-auto pt-4'>
        <UiButton className='w-full' onClick={submit} disabled={isDisabled}>
          Add
        </UiButton>
      </div>
    </div>
  )
}
