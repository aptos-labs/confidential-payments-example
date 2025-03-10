import { time } from '@distributedlab/tools'
import {
  Check,
  Copy,
  CreditCard,
  FolderSync,
  Snowflake,
  TriangleAlertIcon,
} from 'lucide-react'
import { HTMLAttributes, useCallback, useMemo, useState } from 'react'

import { ErrorHandler, formatBalance } from '@/helpers'
import { useCopyToClipboard } from '@/hooks'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
import { TokenBaseInfo } from '@/store/wallet'
import { cn } from '@/theme/utils'
import UiCarousel from '@/ui/UiCarousel'
import { UiSidebarInset, UiSidebarProvider } from '@/ui/UiSidebar'

export default function Dashboard() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    selectedToken,

    // selectedAccountDecryptionKey,
    selectedAccountDecryptionKeyStatus,

    registerAccountEncryptionKey,
    unfreezeAccount,
    normalizeAccount,
    rolloverAccount,
    transfer,
    withdraw,

    loadSelectedDecryptionKeyState,
    // decryptionKeyStatusLoadingState,

    txHistory,
    addTxHistoryItem,

    testMintTokens,

    reloadAptBalance,
  } = useConfidentialCoinContext()

  const isActionsDisabled =
    !selectedAccountDecryptionKeyStatus.isRegistered || isSubmitting

  const [isRefreshing, setIsRefreshing] = useState(false)

  const tryRefresh = useCallback(async () => {
    setIsSubmitting(true)
    setIsRefreshing(true)
    try {
      await Promise.all([loadSelectedDecryptionKeyState(), reloadAptBalance()])
    } catch (error) {
      ErrorHandler.processWithoutFeedback(error)
    }
    setIsRefreshing(false)
    setIsSubmitting(false)
  }, [loadSelectedDecryptionKeyState, reloadAptBalance])

  const tryRollover = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const rolloverAccountTxReceipts = await rolloverAccount()

      rolloverAccountTxReceipts.forEach(el => {
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
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, rolloverAccount, tryRefresh])

  const tryUnfreeze = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const txReceipt = await unfreezeAccount()
      addTxHistoryItem({
        txHash: txReceipt.hash,
        txType: 'unfreeze',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, tryRefresh, unfreezeAccount])

  const tryRegister = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const txReceipt = await registerAccountEncryptionKey(
        selectedToken.address,
      )
      addTxHistoryItem({
        txHash: txReceipt.hash,
        txType: 'register',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [
    addTxHistoryItem,
    registerAccountEncryptionKey,
    selectedToken.address,
    tryRefresh,
  ])

  const tryNormalize = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const txReceipt = await normalizeAccount()
      addTxHistoryItem({
        txHash: txReceipt.hash,
        txType: 'normalize',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, normalizeAccount, tryRefresh])

  const tryTransfer = useCallback(
    async (
      receiverAddress: string,
      amount: number,
      auditorsEncryptionKeyHexList?: string[],
    ) => {
      setIsSubmitting(true)
      try {
        const txReceipt = await transfer(
          receiverAddress,
          amount,
          auditorsEncryptionKeyHexList,
        )
        addTxHistoryItem({
          txHash: txReceipt.hash,
          txType: 'transfer',
          createdAt: time().timestamp,
        })
        await tryRefresh()
      } catch (error) {
        ErrorHandler.process(error)
      }
      setIsSubmitting(false)
    },
    [addTxHistoryItem, transfer, tryRefresh],
  )

  const tryWithdraw = useCallback(
    async (amount: number) => {
      setIsSubmitting(true)
      try {
        const txReceipt = await withdraw(amount)
        addTxHistoryItem({
          txHash: txReceipt.hash,
          txType: 'withdraw',
          createdAt: time().timestamp,
        })
        await tryRefresh()
      } catch (error) {
        ErrorHandler.process(error)
      }
      setIsSubmitting(false)
    },
    [addTxHistoryItem, tryRefresh, withdraw],
  )

  const tryTestMint = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const [mintTxReceipt, depositTxReceipt] = await testMintTokens()
      addTxHistoryItem({
        txHash: mintTxReceipt.hash,
        txType: 'mint',
        createdAt: time().timestamp,
      })
      addTxHistoryItem({
        txHash: depositTxReceipt.hash,
        txType: 'deposit',
        createdAt: time().timestamp,
      })
      await tryRefresh()
    } catch (error) {
      ErrorHandler.process(error)
    }
    setIsSubmitting(false)
  }, [addTxHistoryItem, testMintTokens, tryRefresh])

  return (
    <UiSidebarProvider>
      {/*<DashboardSidebar />*/}
      <UiSidebarInset>
        {/*<header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>*/}
        {/*  <div className='flex items-center gap-2 px-4'>*/}
        {/*    <UiSidebarTrigger className='-ml-1' />*/}
        {/*    <UiSeparator orientation='vertical' className='mr-2 h-4' />*/}
        {/*  </div>*/}
        {/*</header>*/}
        <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
          <ConfidentialAssetsList />
        </div>
      </UiSidebarInset>
    </UiSidebarProvider>
  )
}

function ConfidentialAssetsList() {
  const {
    perTokenStatuses,
    selectedAccountDecryptionKey,
    tokens,
    // selectedToken,
    // setSelectedTokenAddress,
    // decryptionKeyStatusLoadingState,
    // addToken,
  } = useConfidentialCoinContext()

  return (
    <div className=''>
      <UiCarousel
        baseWidth={500}
        items={tokens.map((token, idx) => {
          const currTokenStatuses = perTokenStatuses[token.address]

          return (
            <ConfidentialAsset
              key={idx}
              className='w-full'
              token={token}
              encryptionKey={selectedAccountDecryptionKey
                .publicKey()
                .toString()}
              pendingAmount={currTokenStatuses.pendingAmount}
              actualAmount={currTokenStatuses.actualAmount}
              isNormalized={currTokenStatuses.isNormalized}
              isFrozen={currTokenStatuses.isFrozen}
              isRegistered={currTokenStatuses.isRegistered}
              onRollover={() => {}}
            />
          )
        })}
      />
    </div>
  )
}

function ConfidentialAsset({
  token,
  encryptionKey,
  pendingAmount,
  actualAmount,

  isNormalized,
  isFrozen,
  isRegistered,

  onRollover,

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
  const VBStatusContent = useMemo(() => {
    const commonClasses =
      'z-10 flex justify-center items-center gap-2 overflow-hidden bg-errorMain pt-1'

    if (!isRegistered) {
      return (
        <div className={cn(commonClasses, 'bg-textSecondary')}>
          <span className='text-textPrimary typography-body2'>
            Balance is not registered
          </span>
          <CreditCard size={18} className='text-baseWhite' />
        </div>
      )
    }

    if (isFrozen) {
      return (
        <div className={cn(commonClasses, 'bg-componentDisabled')}>
          <span className='text-textPrimary typography-body2'>
            Balance is Frozen
          </span>
          <Snowflake size={18} className='text-baseWhite' />
          {/*<UiIcon*/}
          {/*  libIcon='FontAwesome'*/}
          {/*  name='snowflake-o'*/}
          {/*  size={18}*/}
          {/*  className='text-baseWhite'*/}
          {/*/>*/}
        </div>
      )
    }

    if (!isNormalized) {
      return (
        <div className={cn(commonClasses, 'bg-warningDarker')}>
          <span className='text-textPrimary typography-body2'>
            Balance is unnormalized
          </span>
          <TriangleAlertIcon size={18} className='text-baseWhite' />

          {/*<UiIcon*/}
          {/*  libIcon='FontAwesome'*/}
          {/*  name='exclamation-triangle'*/}
          {/*  size={18}*/}
          {/*  className='text-baseWhite'*/}
          {/*/>*/}
        </div>
      )
    }

    return
  }, [isFrozen, isNormalized, isRegistered])

  const { copy, isCopied } = useCopyToClipboard()

  return (
    <div {...rest} className={cn('relative', className)}>
      <div
        className={cn(
          'z-20 flex flex-col gap-4 rounded-2xl bg-componentPrimary p-4',
        )}
      >
        {VBStatusContent}

        <div className='flex items-center gap-2'>
          <span className='text-textPrimary typography-subtitle2'>
            {token.name}
          </span>

          <button onClick={() => copy(token.address)}>
            {isCopied ? (
              <Check size={18} className={'pl-2 text-textSecondary'} />
            ) : (
              <Copy size={18} className={'pl-2 text-textSecondary'} />
            )}

            {/*<UiIcon*/}
            {/*  libIcon='AntDesign'*/}
            {/*  name={isCopied ? 'check' : 'copy1'}*/}
            {/*  size={16}*/}
            {/*  className='pl-2 text-textSecondary'*/}
            {/*/>*/}
          </button>
        </div>

        <div className='flex items-center'>
          <div className='flex flex-col gap-1'>
            <span className='text-textSecondary typography-caption1'>
              Pending / <span className='text-textPrimary'>Actual</span>
            </span>
            <div className='text-textPrimary typography-subtitle1'>
              <span className='text-textSecondary'>
                {formatBalance(pendingAmount, token.decimals)}
              </span>
              {' / '}
              {formatBalance(actualAmount, token.decimals)}
            </div>
          </div>

          {/*TODO: isNaN*/}
          {Boolean(+pendingAmount) && (
            <button className='ml-auto' onClick={onRollover}>
              <FolderSync size={16} className='text-textPrimary' />

              {/*<UiIcon*/}
              {/*  libIcon='AntDesign'*/}
              {/*  name='sync'*/}
              {/*  size={16}*/}
              {/*  className='text-textPrimary'*/}
              {/*/>*/}
            </button>
          )}
        </div>

        <CopyField label='Encryption Key' text={encryptionKey} />
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
        <span className='line-clamp-1 flex-1 text-textPrimary typography-body2'>
          {text}
        </span>
        <button className='p-4' onClick={() => copy(text)}>
          {isCopied ? (
            <Check size={22} className='text-textSecondary' />
          ) : (
            <Copy size={22} className='text-textSecondary' />
          )}

          {/*<UiIcon*/}
          {/*  libIcon='AntDesign'*/}
          {/*  name={isCopied ? 'check' : 'copy1'}*/}
          {/*  size={22}*/}
          {/*  className='text-textSecondary'*/}
          {/*/>*/}
        </button>
      </div>
    </div>
  )
}
