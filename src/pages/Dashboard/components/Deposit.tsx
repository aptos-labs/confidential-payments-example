import QRCode from 'react-qr-code'

import { RoutePaths } from '@/enums'
import { useCopyToClipboard } from '@/hooks'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
import { UiIcon } from '@/ui'

export default function Deposit() {
  const { selectedAccountDecryptionKey, selectedToken } =
    useConfidentialCoinContext()

  const encryptionKey = selectedAccountDecryptionKey.publicKey().toString()

  const value = `${window.location.origin}${RoutePaths.Dashboard}?action=send&asset=${selectedToken.address}&to=${encryptionKey}`

  const { copy, isCopied } = useCopyToClipboard()

  return (
    <div className='flex flex-col items-center gap-4'>
      <div className='aspect-square w-full rounded-xl border-2 border-textPrimary p-4'>
        <QRCode
          size={256}
          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          value={value}
          viewBox={`0 0 256 256`}
        />
      </div>

      <div className='flex w-full flex-col gap-2'>
        <span className='self-start uppercase text-textPrimary typography-caption3'>
          Encryption key
        </span>
        <div className='flex w-full items-center gap-2 rounded-xl bg-componentPrimary p-4'>
          <div className='flex-1 overflow-hidden text-ellipsis'>
            {encryptionKey}
          </div>
          <button className='flex' onClick={() => copy(encryptionKey)}>
            <UiIcon
              name={isCopied ? 'CheckIcon' : 'CopyIcon'}
              size={20}
              className={'text-textPrimary'}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
