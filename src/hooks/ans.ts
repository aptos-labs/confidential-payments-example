import {
  Account,
  AccountAddress,
  AccountAddressInput,
  KeylessPublicKey,
} from '@aptos-labs/ts-sdk';
import { useMutation, useQuery } from '@tanstack/react-query';

import { sendAndWaitTx } from '@/api/modules/aptos';
import { aptos } from '@/api/modules/aptos/client';
import { appConfig } from '@/config';
import { GasStationArgs } from '@/store/gas-station';

/**
 * Look up the ANS subdomains for the user's address, under the configured domain we're
 * using for this app.
 */
export function useGetAnsSubdomains({
  accountAddress: accountAddressRaw,
  enabled = true,
}: {
  accountAddress: AccountAddressInput;
  enabled?: boolean;
}) {
  const accountAddress = AccountAddress.from(accountAddressRaw);
  return useQuery({
    queryKey: ['ansName', accountAddress],
    queryFn: async () => {
      const result = await aptos.ans.getDomainSubdomains({
        domain: appConfig.ANS_DOMAIN,
        options: {
          where: {
            registered_address: {
              _eq: accountAddress.toStringLong(),
            },
          },
        },
      });
      const subdomain = result[0]?.subdomain;
      const additionalSubdomains = result
        .slice(1)
        .map(subdomain => subdomain.subdomain);
      return { subdomain, additionalSubdomains };
    },
    enabled,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 1000,
  });
}

/**
 * Return true if the subdomain is available, false otherwise.
 */
export function useCheckIsSubdomainAvailable({
  subdomain,
  enabled = true,
}: {
  subdomain: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['ansSubdomainAvailability', subdomain],
    queryFn: async () => {
      const result = await aptos.ans.getOwnerAddress({
        name: `${subdomain}.${appConfig.ANS_DOMAIN}`,
      });
      return result === undefined;
    },
    enabled,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 1000,
  });
}

export function useClaimAnsSubdomain() {
  return useMutation({
    mutationFn: async ({
      account,
      keylessPublicKey,
      subdomain,
      gasStationArgs,
    }: {
      account: Account;
      keylessPublicKey: KeylessPublicKey;
      subdomain: string;
      gasStationArgs: GasStationArgs;
    }) => {
      const txn = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${appConfig.SUBDOMAIN_MANAGER_CONTRACT_ADDR}::subdomain_manager::claim_subdomain_without_admin_approval`,
          functionArguments: [
            appConfig.SUBDOMAIN_MANAGER_OBJECT_ADDR,
            subdomain,
            keylessPublicKey.bcsToBytes(),
          ],
        },
        withFeePayer: gasStationArgs.withGasStation,
      });
      return await sendAndWaitTx(txn, account, gasStationArgs);
    },
  });
}

/** Look up the address an ANS subdomain resolves to. */
export function useGetAnsSubdomainAddress({
  subdomain,
  enabled = true,
}: {
  subdomain: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['ansSubdomainAddress', subdomain],
    queryFn: async () => {
      const out = await aptos.ans.getTargetAddress({
        name: `${subdomain}.${appConfig.ANS_DOMAIN}`,
      });
      return out ?? null;
    },
    enabled,
  });
}

/** Look up the primary name an address resolves to. */
export function useGetAnsPrimaryName({
  accountAddress,
  enabled = true,
}: {
  accountAddress: AccountAddressInput;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['ansPrimaryName', accountAddress],
    queryFn: async () => {
      const out = await aptos.ans.getPrimaryName({
        address: accountAddress,
      });
      return out ?? null;
    },
    enabled,
  });
}

export function useGetTargetAddress({
  name,
  enabled = true,
}: {
  name: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['ansTargetAddress', name],
    queryFn: async () => {
      const out = await aptos.ans.getTargetAddress({
        name,
      });
      return out ?? null;
    },
    enabled,
  });
}
