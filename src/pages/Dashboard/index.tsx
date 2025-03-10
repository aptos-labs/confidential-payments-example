import { time } from '@distributedlab/tools'
import Avatar from 'boring-avatars'
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Check,
  CheckIcon,
  Copy,
  CopyIcon,
  CreditCard,
  EditIcon,
  FolderOpenIcon,
  FolderSync,
  FolderSyncIcon,
  HandCoinsIcon,
  IdCardIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  Snowflake,
  TriangleAlertIcon,
  UnlockIcon,
} from 'lucide-react'
import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  useCallback,
  useMemo,
  useState,
} from 'react'

import { ErrorHandler, formatBalance, formatDateDMYT } from '@/helpers'
import { useCopyToClipboard } from '@/hooks'
import DashboardHeader from '@/pages/Dashboard/components/DashboardHeader'
import TokenInfo from '@/pages/Dashboard/components/TokenInfo'
import WithdrawForm from '@/pages/Dashboard/components/WithdrawForm'
import { useConfidentialCoinContext } from '@/pages/Dashboard/context'
import { TokenBaseInfo, TxHistoryItem } from '@/store/wallet'
import { cn } from '@/theme/utils'
import UiCarousel from '@/ui/UiCarousel'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiSheet,
  UiSheetContent,
  UiSheetHeader,
  UiSheetTitle,
  UiSheetTrigger,
} from '@/ui/UiSheet'

import TransferForm from './components/TransferForm'

export default function Dashboard() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTokenInfoSheetOpen, setIsTokenInfoSheetOpen] = useState(false)
  const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false)
  const [isTransferSheetOpen, setIsTransferSheetOpen] = useState(false)

  const {
    selectedToken,

    // selectedAccountDecryptionKey,
    selectedAccountDecryptionKeyStatus,

    registerAccountEncryptionKey,
    unfreezeAccount,
    normalizeAccount,

    loadSelectedDecryptionKeyState,
    // decryptionKeyStatusLoadingState,

    txHistory,
    addTxHistoryItem,

    testMintTokens,

    reloadAptBalance,
  } = useConfidentialCoinContext()

  const isActionsDisabled =
    !selectedAccountDecryptionKeyStatus.isRegistered || isSubmitting

  const [, setIsRefreshing] = useState(false)

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
    <div className='flex size-full flex-1 flex-col'>
      <DashboardHeader />

      <div className='mx-auto self-center'>
        <ConfidentialAssetsList />
      </div>

      <div className='flex w-full flex-row items-center justify-center gap-8'>
        <UiSheet
          open={isTokenInfoSheetOpen}
          onOpenChange={setIsTokenInfoSheetOpen}
        >
          <UiSheetTrigger disabled={isActionsDisabled}>
            <div className={'flex flex-col items-center gap-2 text-center'}>
              <InfoIcon size={32} className='text-textPrimary' />
              <span className='text-textSecondary typography-body2'>
                Token Info
              </span>
            </div>
          </UiSheetTrigger>

          <UiSheetContent className='bg-backgroundContainer'>
            <UiSheetHeader>
              <UiSheetTitle>Token Info</UiSheetTitle>
            </UiSheetHeader>

            <TokenInfo token={selectedToken} />
          </UiSheetContent>
        </UiSheet>

        <UiSheet
          open={isWithdrawSheetOpen}
          onOpenChange={setIsWithdrawSheetOpen}
        >
          <UiSheetTrigger disabled={isActionsDisabled}>
            <div className={'flex flex-col items-center gap-2 text-center'}>
              <ArrowUpIcon size={32} className='text-textPrimary' />
              <span className='text-textSecondary typography-body2'>
                Withdraw
              </span>
            </div>
          </UiSheetTrigger>

          <UiSheetContent className='bg-backgroundContainer'>
            <UiSheetHeader>
              <UiSheetTitle>Withdraw</UiSheetTitle>
            </UiSheetHeader>

            <WithdrawForm
              token={selectedToken}
              onSubmit={() => {
                setIsWithdrawSheetOpen(false)
              }}
            />
          </UiSheetContent>
        </UiSheet>

        <UiSheet
          open={isTransferSheetOpen}
          onOpenChange={setIsTransferSheetOpen}
        >
          <UiSheetTrigger disabled={isActionsDisabled}>
            <div className={'flex flex-col items-center gap-2 text-center'}>
              <ArrowRightIcon size={32} className='text-textPrimary' />
              <span className='text-textSecondary typography-body2'>
                Transfer
              </span>
            </div>
          </UiSheetTrigger>
          <UiSheetContent className='bg-backgroundContainer'>
            <UiSheetHeader>
              <UiSheetTitle>Transfer</UiSheetTitle>
            </UiSheetHeader>
            <TransferForm
              token={selectedToken}
              onSubmit={() => {
                setIsTransferSheetOpen(false)
              }}
            />
          </UiSheetContent>
        </UiSheet>
      </div>

      <div className='mt-10 flex w-full flex-1 flex-col overflow-hidden rounded-t-[24] bg-componentPrimary'>
        <div className='flex w-full flex-1 flex-col'>
          <div className='flex flex-col gap-4 p-4'>
            <span className='uppercase text-textPrimary typography-caption3'>
              Don't forget
            </span>

            {!selectedAccountDecryptionKeyStatus.isRegistered ? (
              <ActionCard
                title='Register Balance'
                desc='Lorem ipsum dolor sit amet concestetur! Lorem ipsum dolor sit amet!'
                leadingContent={
                  <IdCardIcon
                    size={32}
                    className='self-center text-textPrimary'
                  />
                }
                onClick={tryRegister}
                disabled={isSubmitting}
              />
            ) : (
              <>
                {selectedAccountDecryptionKeyStatus.isFrozen && (
                  <ActionCard
                    title='Unfreeze Balance'
                    desc='Lorem ipsum dolor sit amet concestetur! Lorem ipsum dolor sit amet!'
                    leadingContent={
                      <Snowflake
                        size={32}
                        className='self-center text-textPrimary'
                      />
                    }
                    onClick={tryUnfreeze}
                    disabled={isSubmitting}
                  />
                )}

                {!selectedAccountDecryptionKeyStatus.isNormalized && (
                  <ActionCard
                    title='Normalize Balance'
                    desc='Lorem ipsum dolor sit amet concestetur! Lorem ipsum dolor sit amet!'
                    leadingContent={
                      <TriangleAlertIcon
                        size={32}
                        className='self-center text-textPrimary'
                      />
                    }
                    onClick={tryNormalize}
                    disabled={isSubmitting}
                  />
                )}

                <ActionCard
                  title='Test Mint'
                  desc='Mint 10 test tokens'
                  leadingContent={
                    <HandCoinsIcon
                      size={32}
                      className='self-center text-textPrimary'
                    />
                  }
                  onClick={tryTestMint}
                  disabled={isSubmitting}
                />
              </>
            )}
          </div>

          <UiSeparator className='my-4' />

          {txHistory.length ? (
            <div className='flex flex-col gap-6'>
              {txHistory.reverse().map((el, idx) => (
                <TxItem key={idx} {...el} />
              ))}
            </div>
          ) : (
            <FolderOpenIcon
              size={128}
              className='my-auto self-center text-componentDisabled'
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TxItem({
  createdAt,
  txType,
  txHash,
  ...rest
}: HTMLAttributes<HTMLDivElement> & TxHistoryItem) {
  const message = {
    transfer: 'Transfer',
    ['transfer-native']: 'Send APT',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    rollover: 'Rollover',
    'key-rotation': 'Key rotation',
    freeze: 'Freeze',
    unfreeze: 'Unfreeze',
    register: 'Register',
    normalize: 'Normalize',
    mint: 'Mint',
  }[txType]

  const icon = {
    transfer: <ArrowRightIcon size={24} className={cn('text-textPrimary')} />,
    ['transfer-native']: (
      <ArrowRightIcon size={24} className={cn('text-textPrimary')} />
    ),
    deposit: <ArrowDownIcon size={24} className={cn('text-textPrimary')} />,
    withdraw: <ArrowUpIcon size={24} className={cn('text-textPrimary')} />,
    rollover: <FolderSyncIcon size={24} className={cn('text-textPrimary')} />,
    'key-rotation': <KeyIcon size={24} className={cn('text-textPrimary')} />,
    freeze: <LockIcon size={24} className={cn('text-textPrimary')} />,
    unfreeze: <UnlockIcon size={24} className={cn('text-textPrimary')} />,
    register: <IdCardIcon size={24} className={cn('text-textPrimary')} />,
    normalize: <EditIcon size={24} className={cn('text-textPrimary')} />,
    mint: <HandCoinsIcon size={24} className={cn('text-textPrimary')} />,
  }[txType]

  const { isCopied, copy } = useCopyToClipboard()

  return (
    <div
      {...rest}
      className={cn('flex flex-row items-center gap-4', rest.className)}
    >
      <div className='flex size-[48] flex-col items-center justify-center rounded-full bg-componentSelected'>
        {icon}
      </div>
      <div className='flex flex-col gap-2'>
        {createdAt && (
          <span className='text-textPrimary'>{formatDateDMYT(createdAt)}</span>
        )}
        <span className='text-textPrimary'>{message}</span>
      </div>

      <button className='ml-auto p-4' onClick={() => copy(txHash)}>
        {isCopied ? (
          <CheckIcon size={18} className={'text-textSecondary'} />
        ) : (
          <CopyIcon size={18} className={'text-textSecondary'} />
        )}
      </button>
    </div>
  )
}

function ActionCard({
  title,
  desc,
  leadingContent,
  disabled,
  ...rest
}: {
  title: string
  desc?: string
  leadingContent?: ReactElement
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'flex flex-row gap-4 rounded-2xl bg-componentPrimary p-4',
        disabled && 'opacity-50',
        rest.className,
      )}
      disabled={disabled}
    >
      {leadingContent}
      <div className='flex flex-1 flex-col items-start text-left'>
        <span className='text-textPrimary typography-subtitle2'>{title}</span>
        {desc && (
          <span className='text-textSecondary typography-body3'>{desc}</span>
        )}
      </div>
      <div className='flex size-[36] flex-col items-center justify-center self-center rounded-full bg-componentSelected'>
        <ArrowRightIcon size={18} className='text-baseWhite' />
      </div>
    </button>
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
  const {
    rolloverAccount,
    addTxHistoryItem,
    reloadAptBalance,
    loadSelectedDecryptionKeyState,
  } = useConfidentialCoinContext()

  const VBStatusContent = useMemo(() => {
    const commonClasses =
      'z-10 flex flex-col justify-center items-center gap-2 overflow-hidden bg-errorMain pt-1'

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
        </div>
      )
    }

    return
  }, [isFrozen, isNormalized, isRegistered])

  const { copy, isCopied } = useCopyToClipboard()

  const tryRollover = useCallback(async () => {
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

        onRollover()
      })
      await Promise.all([reloadAptBalance(), loadSelectedDecryptionKeyState()])
    } catch (error) {
      ErrorHandler.process(error)
    }
  }, [
    addTxHistoryItem,
    loadSelectedDecryptionKeyState,
    onRollover,
    reloadAptBalance,
    rolloverAccount,
  ])

  return (
    <div
      {...rest}
      className={cn('relative overflow-hidden rounded-2xl', className)}
    >
      <div className={cn('relative isolate')}>
        {token.address && (
          <Avatar
            name={token.address}
            size={600}
            className='absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 object-cover object-center'
          />
        )}

        <div className='z-20 flex size-full flex-col gap-4 rounded-2xl bg-componentPrimary p-4'>
          {VBStatusContent}

          <div className='z-20 flex items-center gap-2'>
            <span className='text-textPrimary typography-subtitle2'>
              {token.name}
            </span>

            <button onClick={() => copy(token.address)}>
              {isCopied ? (
                <Check size={18} className={'pl-2 text-textSecondary'} />
              ) : (
                <Copy size={18} className={'pl-2 text-textSecondary'} />
              )}
            </button>
          </div>

          <div className='z-20 flex items-center'>
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
              <button className='ml-auto' onClick={tryRollover}>
                <FolderSync size={16} className='text-textPrimary' />
              </button>
            )}
          </div>

          <CopyField
            className='z-20'
            label='Encryption Key'
            text={encryptionKey}
          />
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
        <span className='line-clamp-1 flex-1 text-textPrimary typography-body2'>
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
