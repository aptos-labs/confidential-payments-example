'use client';

import { Network } from '@aptos-labs/ts-sdk';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type NetworkState = {
  selectedNetwork: Network;
  _hasHydrated: boolean;
};

type NetworkActions = {
  setSelectedNetwork: (network: Network) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useNetworkStore = create<NetworkState & NetworkActions>()(
  persist(
    set => ({
      selectedNetwork: Network.MAINNET,
      _hasHydrated: false,

      setSelectedNetwork: (network: Network) => {
        set({ selectedNetwork: network });
        window.location.reload();
      },
      setHasHydrated: (value: boolean) => {
        set({ _hasHydrated: value });
      },
    }),
    {
      storage: createJSONStorage(() => localStorage),
      name: 'network-store',
      version: 1,
      onRehydrateStorage: () => state => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const getSelectedNetwork = (): Network => {
  try {
    const stored = localStorage.getItem('network-store');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.selectedNetwork ?? Network.MAINNET;
    }
  } catch {
    // ignore
  }
  return Network.MAINNET;
};
