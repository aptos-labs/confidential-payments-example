'use client';

import { AptosNetwork } from '@/config';
import { useNetworkStore } from '@/store/network';
import { cn } from '@/theme/utils';
import {
  UiDropdownMenu,
  UiDropdownMenuContent,
  UiDropdownMenuRadioGroup,
  UiDropdownMenuRadioItem,
  UiDropdownMenuTrigger,
} from '@/ui/UiDropdownMenu';

const NETWORKS: { value: AptosNetwork; label: string }[] = [
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
];

export default function NetworkPicker() {
  const { network, setNetwork } = useNetworkStore();

  return (
    <UiDropdownMenu>
      <UiDropdownMenuTrigger asChild>
        <button className='flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-textPrimary transition-colors hover:bg-componentPrimary'>
          <span
            className={cn(
              'size-1.5 rounded-full',
              network === 'mainnet' ? 'bg-green-500' : 'bg-amber-400',
            )}
          />
          {network === 'mainnet' ? 'Mainnet' : 'Testnet'}
        </button>
      </UiDropdownMenuTrigger>
      <UiDropdownMenuContent align='end'>
        <UiDropdownMenuRadioGroup
          value={network}
          onValueChange={v => setNetwork(v as AptosNetwork)}
        >
          {NETWORKS.map(n => (
            <UiDropdownMenuRadioItem key={n.value} value={n.value}>
              {n.label}
            </UiDropdownMenuRadioItem>
          ))}
        </UiDropdownMenuRadioGroup>
      </UiDropdownMenuContent>
    </UiDropdownMenu>
  );
}
