import Avatar from 'boring-avatars'
import { Check, Copy } from 'lucide-react'
import { HTMLAttributes } from 'react'

import { formatBalance } from '@/helpers'
import { useCopyToClipboard } from '@/hooks'
import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'

export default function ConfidentialAssetCard({
  token,
  encryptionKey,
  actualAmount,

  // isNormalized,
  // isFrozen,
  // isRegistered,
  //
  // onRollover,

  className,

  ...rest
}: {
  token: TokenBaseInfo
  encryptionKey: string

  pendingAmount: string
  actualAmount: string

  isNormalized: boolean
  isFrozen: boolean
  isRegistered: boolean

  onRollover: () => void
} & HTMLAttributes<HTMLDivElement>) {
  // const {
  // rolloverAccount,
  // addTxHistoryItem,
  // reloadAptBalance,
  // loadSelectedDecryptionKeyState,
  // } = useConfidentialCoinContext()

  // const VBStatusContent = useMemo(() => {
  //   const commonClasses =
  //     'z-10 flex flex-col justify-center items-center gap-2 overflow-hidden bg-errorMain pt-1'
  //
  //   if (!isRegistered) {
  //     return (
  //       <div className={cn(commonClasses, 'bg-textSecondary')}>
  //         <span className='text-textPrimary typography-body2'>
  //           Balance is not registered
  //         </span>
  //         <CreditCard size={18} className='text-baseWhite' />
  //       </div>
  //     )
  //   }
  //
  //   if (isFrozen) {
  //     return (
  //       <div className={cn(commonClasses, 'bg-componentDisabled')}>
  //         <span className='text-textPrimary typography-body2'>
  //           Balance is Frozen
  //         </span>
  //         <Snowflake size={18} className='text-baseWhite' />
  //       </div>
  //     )
  //   }
  //
  //   if (!isNormalized) {
  //     return (
  //       <div className={cn(commonClasses, 'bg-warningDarker')}>
  //         <span className='text-textPrimary typography-body2'>
  //           Balance is unnormalized
  //         </span>
  //         <TriangleAlertIcon size={18} className='text-baseWhite' />
  //       </div>
  //     )
  //   }
  //
  //   return
  // }, [isFrozen, isNormalized, isRegistered])

  const { copy, isCopied } = useCopyToClipboard()

  // const tryRollover = useCallback(async () => {
  //   try {
  //     const rolloverAccountTxReceipts = await rolloverAccount()
  //
  //     rolloverAccountTxReceipts.forEach(el => {
  //       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //       // @ts-ignore
  //       if (el.payload.function.includes('rollover')) {
  //         addTxHistoryItem({
  //           txHash: el.hash,
  //           txType: 'rollover',
  //           createdAt: time().timestamp,
  //         })
  //
  //         return
  //       }
  //
  //       addTxHistoryItem({
  //         txHash: el.hash,
  //         txType: 'normalize',
  //         createdAt: time().timestamp,
  //       })
  //
  //       onRollover()
  //     })
  //     await Promise.all([reloadAptBalance(), loadSelectedDecryptionKeyState()])
  //   } catch (error) {
  //     ErrorHandler.process(error)
  //   }
  // }, [
  //   addTxHistoryItem,
  //   loadSelectedDecryptionKeyState,
  //   onRollover,
  //   reloadAptBalance,
  //   rolloverAccount,
  // ])

  return (
    <div {...rest} className={cn('relative overflow-hidden', className)}>
      <div className={cn('relative')}>
        <div className='flex size-full flex-col items-center gap-4 rounded-2xl p-4'>
          {/*{VBStatusContent}*/}

          <div className='relative flex items-center gap-2'>
            <Avatar name={token.address} size={20} variant='pixel' />

            <span className='text-textPrimary typography-subtitle1'>
              {token.name}
            </span>

            <button
              className='absolute left-full top-1/2 -translate-y-1/2'
              onClick={() => copy(token.address)}
            >
              {isCopied ? (
                <Check size={24} className={'pl-2 text-textSecondary'} />
              ) : (
                <Copy size={24} className={'pl-2 text-textSecondary'} />
              )}
            </button>
          </div>

          <div className='flex items-center'>
            <div className='flex items-end gap-1'>
              <div className='text-textPrimary typography-h2'>
                {formatBalance(actualAmount, token.decimals)}
              </div>
              <span className='-translate-y-[7px] text-textSecondary typography-subtitle2'>
                {token.symbol}
              </span>
            </div>
          </div>

          <CopyField text={encryptionKey} />
        </div>
      </div>
    </div>
  )
}

function CopyField({
  text,
  label,
  ...rest
}: { text: string; label?: string } & HTMLAttributes<HTMLDivElement>) {
  const { isCopied, copy } = useCopyToClipboard()

  return (
    <div {...rest} className={cn('flex flex-col gap-2', rest.className)}>
      {label && (
        <span className='ml-4 text-textSecondary typography-body3'>
          {label}
        </span>
      )}
      <div
        className={cn(
          'flex items-center justify-between rounded-2xl bg-componentPrimary px-4 pr-0',
        )}
      >
        <span className='max-w-[224px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-textPrimary typography-body2'>
          {text}
        </span>
        <button className='p-4' onClick={() => copy(text)}>
          {isCopied ? (
            <Check size={22} className='text-textSecondary' />
          ) : (
            <Copy size={22} className='text-textSecondary' />
          )}
        </button>
      </div>
    </div>
  )
}
