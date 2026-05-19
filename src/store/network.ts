'use client';

import { create } from 'zustand';

import { AptosNetwork, getActiveNetwork } from '@/config';

const STORAGE_KEY = 'aptos_network';
const COOKIE_NAME = 'aptos_network';

type NetworkState = {
  network: AptosNetwork;
  setNetwork: (network: AptosNetwork) => void;
};

export const useNetworkStore = create<NetworkState>(set => ({
  network: getActiveNetwork(),
  setNetwork: (network: AptosNetwork) => {
    set({ network });
    localStorage.setItem(STORAGE_KEY, network);
    document.cookie = `${COOKIE_NAME}=${network};path=/;max-age=31536000`;
    window.location.reload();
  },
}));
