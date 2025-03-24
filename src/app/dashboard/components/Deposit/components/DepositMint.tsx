import { useState } from 'react'

import { useConfidentialCoinContext } from '@/app/dashboard/context'
import { ErrorHandler } from '@/helpers'
import { UiButton } from '@/ui/UiButton'

export default function DepositMint({ onSubmit }: { onSubmit?: () => void }) {
  const { testMintTokens } = useConfidentialCoinContext()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async () => {
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
      <span className='text-textPrimary typography-caption2'>
        Mint tokens from the faucet to use within the application. Ensure you
        have sufficient permissions to access the feature.
      </span>
      <UiButton className='w-full' onClick={submit} disabled={isSubmitting}>
        Buy
      </UiButton>
    </div>
  )
}
