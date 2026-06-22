import { CheckIcon, CopyIcon, ExternalLink, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getAccountExplorerUrl,
  getCoinByFaAddress,
  getUnifiedBalance,
} from '@/api/modules/aptos';
import { useConfidentialCoinContext } from '@/app/dashboard/context';
import { appConfig } from '@/config';
import { abbrCenter, bus, BusEvents, ErrorHandler, sleep, tryCatch } from '@/helpers';
import { useCopyToClipboard } from '@/hooks';
import { useGetAnsSubdomains } from '@/hooks/ans';

type ConvertState = 'waiting' | 'converting' | 'converted';

function CopyRow({ label, value }: { label: string; value: string }) {
  const { copy, isCopied } = useCopyToClipboard();
  return (
    <button
      onClick={() => copy(value)}
      className='flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-solid border-textPrimary px-4 py-3'
    >
      <div className='flex min-w-0 flex-col items-start gap-1'>
        <span className='typography-caption2 text-textSecondary'>{label}</span>
        <span className='typography-subtitle4 max-w-full overflow-hidden text-ellipsis text-textPrimary'>
          {value}
        </span>
      </div>
      {isCopied ? (
        <CheckIcon size={16} className='shrink-0 text-successMain' />
      ) : (
        <CopyIcon size={16} className='shrink-0 text-textPrimary' />
      )}
    </button>
  );
}

export default function DepositAddress() {
  const { selectedAccount, selectedToken, depositTo, depositCoinTo, reloadBalances } =
    useConfidentialCoinContext();
  const address = selectedAccount.accountAddress.toString();
  const { data: ansNameData } = useGetAnsSubdomains({
    accountAddress: selectedAccount.accountAddress,
  });
  const subdomain = ansNameData?.subdomain;
  const username = subdomain ? `${subdomain}.${appConfig.ANS_DOMAIN}.apt` : null;

  const [convertState, setConvertState] = useState<ConvertState>('waiting');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialBalanceRef = useRef<bigint | null>(null);

  const doConvert = useCallback(
    async (amountToDeposit: bigint) => {
      if (!selectedToken || !selectedAccount) return;
      setConvertState('converting');

      const [coin] = await tryCatch(getCoinByFaAddress(selectedToken.address));

      let attempts = 0;
      while (attempts < 5) {
        const [receipt, err] = await tryCatch(
          coin
            ? depositCoinTo(amountToDeposit, selectedAccount.accountAddress.toString())
            : depositTo(amountToDeposit, selectedAccount.accountAddress.toString()),
        );
        if (err) {
          attempts += 1;
          if (attempts >= 5) {
            ErrorHandler.process(err);
            setConvertState('waiting');
            return;
          }
          await sleep(200);
          continue;
        }

        const [, reloadErr] = await tryCatch(reloadBalances(BigInt(receipt.version)));
        if (reloadErr) {
          ErrorHandler.process(reloadErr);
          setConvertState('waiting');
          return;
        }

        const formatted = (
          Number(amountToDeposit) / Math.pow(10, selectedToken.decimals)
        ).toFixed(2);
        bus.emit(
          BusEvents.Success,
          `Successfully converted ${formatted} ${selectedToken.symbol} to confidential APT`,
        );
        setConvertState('converted');
        return;
      }
    },
    [depositCoinTo, depositTo, reloadBalances, selectedAccount, selectedToken],
  );

  useEffect(() => {
    if (!selectedToken || !selectedAccount) return;

    let cancelled = false;
    (async () => {
      const [initial] = await tryCatch(
        getUnifiedBalance(
          selectedAccount.accountAddress.toString(),
          selectedToken.address,
        ),
      );
      if (cancelled) return;
      initialBalanceRef.current = initial ?? 0n;

      pollingRef.current = setInterval(async () => {
        const [current, err] = await tryCatch(
          getUnifiedBalance(
            selectedAccount.accountAddress.toString(),
            selectedToken.address,
          ),
        );
        if (err || current === undefined) return;
        const initialBal = initialBalanceRef.current ?? 0n;
        if (current > initialBal) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          await doConvert(current);
        }
      }, 400);
    })();

    return () => {
      cancelled = true;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [doConvert, selectedAccount, selectedToken]);

  const statusText =
    convertState === 'waiting'
      ? 'Waiting for funds to arrive...'
      : convertState === 'converting'
        ? 'Converting to confidential APT...'
        : 'Converted!';

  return (
    <div className='flex w-full flex-col gap-3'>
      <p className='typography-body2 text-textSecondary'>
        Send funds to this address to deposit. They will be converted to confidential
        APT automatically once they arrive.
      </p>
      {username && <CopyRow label='Username' value={username} />}
      <CopyRow label='Address' value={address} />
      <Link
        href={getAccountExplorerUrl(address)}
        target='_blank'
        className='flex items-center justify-center gap-2 text-sm text-textSecondary hover:text-textPrimary'
      >
        <ExternalLink size={14} />
        View on Explorer ({abbrCenter(address)})
      </Link>
      <div className='flex items-center justify-center gap-2 text-sm text-textSecondary'>
        {convertState === 'converted' ? (
          <CheckIcon size={14} className='text-successMain' />
        ) : (
          <RefreshCw size={14} className='animate-spin' />
        )}
        <span className={convertState === 'converted' ? 'text-successMain' : ''}>
          {statusText}
        </span>
      </div>
    </div>
  );
}
