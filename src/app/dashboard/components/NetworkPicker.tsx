'use client';

import { Network } from '@aptos-labs/ts-sdk';

import { useNetworkStore } from '@/store/network';
import { cn } from '@/theme/utils';

const NETWORKS = [
  { value: Network.MAINNET, label: 'Mainnet' },
  { value: Network.TESTNET, label: 'Testnet' },
] as const;

export default function NetworkPicker() {
  const { selectedNetwork, setSelectedNetwork } = useNetworkStore();

  return (
    <div className='flex items-center rounded-full bg-componentPrimary p-0.5'>
      {NETWORKS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => {
            if (value !== selectedNetwork) {
              setSelectedNetwork(value);
            }
          }}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            value === selectedNetwork
              ? 'bg-primary text-primary-foreground'
              : 'text-textSecondary hover:text-textPrimary',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
