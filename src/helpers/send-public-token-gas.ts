import { Account, KeylessAccount } from '@aptos-labs/ts-sdk';

import {
  getConfidentialBalances,
  getIsAccountRegisteredWithToken,
  getUnifiedBalance,
} from '@/api/modules/aptos';
import { APT_FA_ADDR, PUBLIC_APT_GAS_RESERVE_OCTAS } from '@/config';

import { formatBalance } from './formatters';

export const PUBLIC_APT_GAS_RESERVE_HUMAN = '0.05';

export type SendPublicTokenGasReadiness = {
  publicApt: bigint;
  confidentialApt: bigint;
  canSend: boolean;
  warning?: string;
  info?: string;
};

export async function getSendPublicTokenGasReadiness(
  account: Account | KeylessAccount,
  decryptionKeyHex: string,
): Promise<SendPublicTokenGasReadiness> {
  const accountAddress = account.accountAddress.toString();
  const publicApt = await getUnifiedBalance(accountAddress, APT_FA_ADDR);

  let confidentialApt = 0n;
  const isRegistered = await getIsAccountRegisteredWithToken(account, APT_FA_ADDR);
  if (isRegistered) {
    const { pending, available } = await getConfidentialBalances(
      account,
      decryptionKeyHex,
      APT_FA_ADDR,
    );
    confidentialApt = pending + available;
  }

  if (publicApt >= PUBLIC_APT_GAS_RESERVE_OCTAS) {
    return { publicApt, confidentialApt, canSend: true };
  }

  if (confidentialApt >= PUBLIC_APT_GAS_RESERVE_OCTAS) {
    return {
      publicApt,
      confidentialApt,
      canSend: true,
      info: `Public APT is below ${PUBLIC_APT_GAS_RESERVE_HUMAN}. ${PUBLIC_APT_GAS_RESERVE_HUMAN} APT will be withdrawn from your confidential balance for gas before sending.`,
    };
  }

  if (publicApt === 0n && confidentialApt === 0n) {
    return {
      publicApt,
      confidentialApt,
      canSend: false,
      warning: `This account has no APT to pay gas. You need at least ${PUBLIC_APT_GAS_RESERVE_HUMAN} APT before sending a public token.`,
    };
  }

  return {
    publicApt,
    confidentialApt,
    canSend: false,
    warning: `Not enough APT for gas. You have ${formatBalance(publicApt, 8)} public APT and ${formatBalance(confidentialApt, 8)} confidential APT, but at least ${PUBLIC_APT_GAS_RESERVE_HUMAN} APT is required.`,
  };
}

export function getSendPublicTokenErrorMessage(error: unknown): string {
  const text =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);

  if (text.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
    return 'Transfer failed: not enough APT left to pay transaction gas.';
  }

  if (text.includes('OUT_OF_GAS')) {
    return 'Transfer failed: the transaction ran out of gas. Please try again.';
  }

  if (text.includes('Timed out waiting for public APT')) {
    return 'Gas APT was withdrawn but did not show up in your public balance in time. Please wait a moment and try again.';
  }

  if (
    text.includes('no APT to pay gas') ||
    text.includes('Not enough APT for gas') ||
    text.includes('Not enough APT to pay gas')
  ) {
    return text;
  }

  const jsonMessage = text.match(/"message"\s*:\s*"([^"]+)"/)?.[1];
  if (jsonMessage) {
    if (jsonMessage.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
      return 'Transfer failed: not enough APT left to pay transaction gas.';
    }
    return `Transfer failed: ${jsonMessage}`;
  }

  if (error instanceof Error && text && !text.startsWith('Request to [Fullnode]')) {
    return text;
  }

  return 'Transfer failed. Please try again.';
}
