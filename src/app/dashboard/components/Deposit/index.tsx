'use client';

import DepositMint from './components/DepositMint';

export default function Deposit({ onSubmit }: { onSubmit?: () => void }) {
  return (
    <div className='flex flex-col items-center gap-4'>
      <DepositMint onSubmit={onSubmit} />
    </div>
  );
}
