import { DashboardSidebar } from '@/pages/Dashboard/components/DashboardSidebar'
import { UiSeparator } from '@/ui/UiSeparator'
import {
  UiSidebarInset,
  UiSidebarProvider,
  UiSidebarTrigger,
} from '@/ui/UiSidebar'

export default function Dashboard() {
  // const [isSubmitting, setIsSubmitting] = useState(false)
  //
  // const {
  //   selectedToken,
  //
  //   // selectedAccountDecryptionKey,
  //   selectedAccountDecryptionKeyStatus,
  //
  //   registerAccountEncryptionKey,
  //   unfreezeAccount,
  //   normalizeAccount,
  //   rolloverAccount,
  //   transfer,
  //   withdraw,
  //
  //   loadSelectedDecryptionKeyState,
  //   // decryptionKeyStatusLoadingState,
  //
  //   txHistory,
  //   addTxHistoryItem,
  //
  //   testMintTokens,
  //
  //   reloadAptBalance,
  // } = useConfidentialCoinContext()
  //
  // const isActionsDisabled =
  //   !selectedAccountDecryptionKeyStatus.isRegistered || isSubmitting
  //
  // const [isRefreshing, setIsRefreshing] = useState(false)
  //
  // const tryRefresh = useCallback(async () => {
  //   setIsSubmitting(true)
  //   setIsRefreshing(true)
  //   try {
  //     await Promise.all([loadSelectedDecryptionKeyState(), reloadAptBalance()])
  //   } catch (error) {
  //     ErrorHandler.processWithoutFeedback(error)
  //   }
  //   setIsRefreshing(false)
  //   setIsSubmitting(false)
  // }, [loadSelectedDecryptionKeyState, reloadAptBalance])
  //
  // const tryRollover = useCallback(async () => {
  //   setIsSubmitting(true)
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
  //     })
  //     await tryRefresh()
  //   } catch (error) {
  //     ErrorHandler.process(error)
  //   }
  //   setIsSubmitting(false)
  // }, [addTxHistoryItem, rolloverAccount, tryRefresh])
  //
  // const tryUnfreeze = useCallback(async () => {
  //   setIsSubmitting(true)
  //   try {
  //     const txReceipt = await unfreezeAccount()
  //     addTxHistoryItem({
  //       txHash: txReceipt.hash,
  //       txType: 'unfreeze',
  //       createdAt: time().timestamp,
  //     })
  //     await tryRefresh()
  //   } catch (error) {
  //     ErrorHandler.process(error)
  //   }
  //   setIsSubmitting(false)
  // }, [addTxHistoryItem, tryRefresh, unfreezeAccount])
  //
  // const tryRegister = useCallback(async () => {
  //   setIsSubmitting(true)
  //   try {
  //     const txReceipt = await registerAccountEncryptionKey(
  //       selectedToken.address,
  //     )
  //     addTxHistoryItem({
  //       txHash: txReceipt.hash,
  //       txType: 'register',
  //       createdAt: time().timestamp,
  //     })
  //     await tryRefresh()
  //   } catch (error) {
  //     ErrorHandler.process(error)
  //   }
  //   setIsSubmitting(false)
  // }, [
  //   addTxHistoryItem,
  //   registerAccountEncryptionKey,
  //   selectedToken.address,
  //   tryRefresh,
  // ])
  //
  // const tryNormalize = useCallback(async () => {
  //   setIsSubmitting(true)
  //   try {
  //     const txReceipt = await normalizeAccount()
  //     addTxHistoryItem({
  //       txHash: txReceipt.hash,
  //       txType: 'normalize',
  //       createdAt: time().timestamp,
  //     })
  //     await tryRefresh()
  //   } catch (error) {
  //     ErrorHandler.process(error)
  //   }
  //   setIsSubmitting(false)
  // }, [addTxHistoryItem, normalizeAccount, tryRefresh])
  //
  // const tryTransfer = useCallback(
  //   async (
  //     receiverAddress: string,
  //     amount: number,
  //     auditorsEncryptionKeyHexList?: string[],
  //   ) => {
  //     setIsSubmitting(true)
  //     try {
  //       const txReceipt = await transfer(
  //         receiverAddress,
  //         amount,
  //         auditorsEncryptionKeyHexList,
  //       )
  //       addTxHistoryItem({
  //         txHash: txReceipt.hash,
  //         txType: 'transfer',
  //         createdAt: time().timestamp,
  //       })
  //       await tryRefresh()
  //     } catch (error) {
  //       ErrorHandler.process(error)
  //     }
  //     setIsSubmitting(false)
  //   },
  //   [addTxHistoryItem, transfer, tryRefresh],
  // )
  //
  // const tryWithdraw = useCallback(
  //   async (amount: number) => {
  //     setIsSubmitting(true)
  //     try {
  //       const txReceipt = await withdraw(amount)
  //       addTxHistoryItem({
  //         txHash: txReceipt.hash,
  //         txType: 'withdraw',
  //         createdAt: time().timestamp,
  //       })
  //       await tryRefresh()
  //     } catch (error) {
  //       ErrorHandler.process(error)
  //     }
  //     setIsSubmitting(false)
  //   },
  //   [addTxHistoryItem, tryRefresh, withdraw],
  // )
  //
  // const tryTestMint = useCallback(async () => {
  //   setIsSubmitting(true)
  //   try {
  //     const [mintTxReceipt, depositTxReceipt] = await testMintTokens()
  //     addTxHistoryItem({
  //       txHash: mintTxReceipt.hash,
  //       txType: 'mint',
  //       createdAt: time().timestamp,
  //     })
  //     addTxHistoryItem({
  //       txHash: depositTxReceipt.hash,
  //       txType: 'deposit',
  //       createdAt: time().timestamp,
  //     })
  //     await tryRefresh()
  //   } catch (error) {
  //     ErrorHandler.process(error)
  //   }
  //   setIsSubmitting(false)
  // }, [addTxHistoryItem, testMintTokens, tryRefresh])

  return (
    <UiSidebarProvider>
      <DashboardSidebar />
      <UiSidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <UiSidebarTrigger className='-ml-1' />
            <UiSeparator orientation='vertical' className='mr-2 h-4' />
          </div>
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
          <div className='grid auto-rows-min gap-4 md:grid-cols-3'>
            <div className='bg-muted/50 aspect-video rounded-xl' />
            <div className='bg-muted/50 aspect-video rounded-xl' />
            <div className='bg-muted/50 aspect-video rounded-xl' />
          </div>
          <div className='bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min' />
        </div>
      </UiSidebarInset>
    </UiSidebarProvider>
  )
}
