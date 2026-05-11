'use client';

import { appConfig } from '@/config';

import DepositAddress from './components/DepositAddress';
import DepositMint from './components/DepositMint';

export default function Deposit({ onSubmit }: { onSubmit?: () => void }) {
  const isMainnet = appConfig.APTOS_NETWORK === 'mainnet';
  return (
    <div className='flex flex-col items-center gap-4'>
      {isMainnet ? <DepositAddress /> : <DepositMint onSubmit={onSubmit} />}
    </div>
  );
}
