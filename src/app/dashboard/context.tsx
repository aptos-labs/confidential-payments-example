'use client';

import {
  EncryptedAmount,
  TwistedEd25519PrivateKey,
} from '@aptos-labs/confidential-assets';
import {
  Account,
  AnyNumber,
  CommittedTransactionResponse,
  KeylessAccount,
  SimpleTransaction,
} from '@aptos-labs/ts-sdk';
import { appConfig } from '@config';
import { FixedNumber, parseUnits } from 'ethers';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { PropsWithChildren } from 'react';
import { useCallback } from 'react';
import { createContext, useContext, useMemo } from 'react';

import {
  buildDepositConfidentialBalanceCoinTx,
  buildDepositConfidentialBalanceTx,
  depositConfidentialBalance,
  depositConfidentialBalanceCoin,
  getCoinByFaAddress,
  getConfidentialBalances,
  getFABalance,
  getFungibleAssetMetadata,
  getIsAccountRegisteredWithToken,
  getIsBalanceFrozen,
  getIsBalanceNormalized,
  getPrimaryTokenBalance,
  mintPrimaryToken,
  normalizeConfidentialBalance,
  parseCoinTypeFromCoinStruct,
  registerConfidentialBalance,
  rolloverConfidentialBalance,
  sendAndWaitTx,
  transferConfidentialAsset,
  withdrawConfidentialBalance,
} from '@/api/modules/aptos';
import { ErrorHandler, tryCatch } from '@/helpers';
import { useLoading } from '@/hooks';
import { authStore } from '@/store/auth';
import { useGasStationArgs } from '@/store/gas-station';
import { type TokenBaseInfo, walletStore } from '@/store/wallet';

type AccountDecryptionKeyStatus = {
  isFrozen: boolean;
  isNormalized: boolean;
  isRegistered: boolean;

  pendingAmount: string;
  availableAmount: string;
  fungibleAssetBalance: string;
};

const AccountDecryptionKeyStatusRawDefault: Omit<
  AccountDecryptionKeyStatus,
  'pendingAmount' | 'availableAmount'
> & {
  pending: EncryptedAmount | undefined;
  available: EncryptedAmount | undefined;
} = {
  isFrozen: false,
  isNormalized: false,
  isRegistered: false,

  pending: undefined,
  available: undefined,
  fungibleAssetBalance: '',
};

const AccountDecryptionKeyStatusDefault: AccountDecryptionKeyStatus = {
  isFrozen: false,
  isNormalized: false,
  isRegistered: false,

  pendingAmount: '0',
  availableAmount: '0',
  fungibleAssetBalance: '0',
};

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

type KeylessAccountPublic = {
  idToken: string;
  name: string;
  avatarUrl: string;
};

type ConfidentialCoinContextType = {
  accountsList: (Account | KeylessAccountPublic)[];

  selectedAccount: Account | KeylessAccount;

  accountsLoadingState: LoadingState;

  addNewAccount: (privateKeyHex?: string) => void;
  removeAccount: (accountAddress: string) => void;
  setSelectedAccount: (
    args:
      | { accountAddressHex: string; pubKeylessAcc?: never }
      | { accountAddressHex?: never; pubKeylessAcc: KeylessAccountPublic },
  ) => Promise<void>;

  // aptBalance: number;
  // reloadAptBalance: () => Promise<void>;

  primaryTokenBalance: number;
  reloadPrimaryTokenBalance: (minimumLedgerVersion?: bigint) => Promise<void>;

  reloadBalances: (minimumLedgerVersion?: bigint) => Promise<void>;

  tokens: TokenBaseInfo[];
  tokensLoadingState: LoadingState;
  perTokenStatuses: Record<string, AccountDecryptionKeyStatus>;

  selectedToken: TokenBaseInfo;

  addToken: (token: TokenBaseInfo) => void;
  removeToken: (address: string) => void;
  setSelectedTokenAddress: (tokenAddress: string) => void;

  selectedAccountDecryptionKey: TwistedEd25519PrivateKey;
  selectedAccountDecryptionKeyStatus: AccountDecryptionKeyStatus;

  registerAccountEncryptionKey: (
    tokenAddress: string,
  ) => Promise<CommittedTransactionResponse>;
  normalizeAccount: () => Promise<CommittedTransactionResponse>;
  unfreezeAccount: () => Promise<CommittedTransactionResponse>;
  rolloverAccount: () => Promise<CommittedTransactionResponse[]>;
  transfer: (
    receiverEncryptionKeyHex: string,
    amount: string,
    opts?: {
      isSyncFirst?: boolean;

      auditorsEncryptionKeyHexList?: string[];
    },
  ) => Promise<CommittedTransactionResponse[]>;
  buildWithdrawToTx: (
    amount: string,
    receiver: string,
    opts?: {
      isSyncFirst?: boolean;
    },
  ) => Promise<SimpleTransaction>;
  withdrawTo: (
    amount: string,
    receiver: string,
    opts?: {
      isSyncFirst?: boolean;
    },
  ) => Promise<CommittedTransactionResponse>;
  depositTo: (amount: bigint, to: string) => Promise<CommittedTransactionResponse>;
  depositCoinTo: (amount: bigint, to: string) => Promise<CommittedTransactionResponse>;
  // TODO: rotate keys

  decryptionKeyStatusLoadingState: LoadingState;
  loadSelectedDecryptionKeyState: (minimumLedgerVersion?: AnyNumber) => Promise<void>;

  testMintTokens: (amount: string) => Promise<CommittedTransactionResponse[]>;
  ensureConfidentialBalanceReadyBeforeOp: (args: {
    amountToEnsure: string;
    token: TokenBaseInfo;
    currentTokenStatus: AccountDecryptionKeyStatus;
  }) => Promise<Error | undefined>;
};

const confidentialCoinContext = createContext<ConfidentialCoinContextType>({
  // feePayerAccount: {} as Account,
  accountsList: [],
  selectedAccount: {} as Account,
  accountsLoadingState: 'idle',

  addNewAccount: () => {},
  removeAccount: () => {},
  setSelectedAccount: async () => {},

  // aptBalance: 0,
  // reloadAptBalance: async () => {},

  primaryTokenBalance: 0,
  reloadPrimaryTokenBalance: async () => {},
  reloadBalances: async () => {},

  tokens: [],
  tokensLoadingState: 'idle',
  perTokenStatuses: {},
  selectedToken: {} as TokenBaseInfo,

  addToken: () => {},
  removeToken: () => {},
  setSelectedTokenAddress: () => {},

  selectedAccountDecryptionKey: TwistedEd25519PrivateKey.generate(),
  selectedAccountDecryptionKeyStatus: {
    isFrozen: false,
    isNormalized: true,
    isRegistered: true,
    pendingAmount: '0',
    availableAmount: '0',
    fungibleAssetBalance: '0',
  },

  registerAccountEncryptionKey: async () => ({}) as CommittedTransactionResponse,
  normalizeAccount: async () => ({}) as CommittedTransactionResponse,
  unfreezeAccount: async () => ({}) as CommittedTransactionResponse,
  rolloverAccount: async () => ({}) as CommittedTransactionResponse[],
  transfer: async () => ({}) as CommittedTransactionResponse[],
  buildWithdrawToTx: async () => ({}) as SimpleTransaction,
  withdrawTo: async () => ({}) as CommittedTransactionResponse,
  depositTo: async () => ({}) as CommittedTransactionResponse,
  depositCoinTo: async () => ({}) as CommittedTransactionResponse,

  decryptionKeyStatusLoadingState: 'idle',
  loadSelectedDecryptionKeyState: async () => {},

  testMintTokens: async () => [] as CommittedTransactionResponse[],
  ensureConfidentialBalanceReadyBeforeOp: async () => undefined,
});

export const useConfidentialCoinContext = () => {
  return useContext(confidentialCoinContext);
};

const useSelectedAccount = () => {
  const activeKeylessAccount = authStore.useAuthStore(state => state.activeAccount);
  const selectedWalletAccount = walletStore.useSelectedWalletAccount();

  return useMemo(
    () => selectedWalletAccount || activeKeylessAccount!,
    [activeKeylessAccount, selectedWalletAccount],
  );
};

const useAccounts = () => {
  const rawKeylessAccounts = authStore.useAuthStore(state => state.accounts);
  const walletAccounts = walletStore.useWalletAccounts();
  const switchActiveKeylessAccount = authStore.useAuthStore(
    state => state.switchKeylessAccount,
  );

  const addAndSetPrivateKey = walletStore.useWalletStore(
    state => state.addAndSetPrivateKey,
  );
  const removeWalletAccount = walletStore.useWalletStore(
    state => state.removeWalletAccount,
  );
  const setSelectedAccountAddr = walletStore.useWalletStore(
    state => state.setSelectedAccountAddr,
  );

  const selectedAccount = useSelectedAccount();

  const {
    data: { accountsList },
    isLoading: isAccountsLoading,
    isLoadingError: isAccountsLoadingError,
  } = useLoading<{
    accountsList: ConfidentialCoinContextType['accountsList'];
  }>(
    {
      accountsList: [],
    },
    async () => {
      const keylessAccountsData = await Promise.all(
        rawKeylessAccounts.map(async el => {
          const decodedIdToken = jwtDecode<
            JwtPayload & {
              name: string;
              picture: string;
            }
          >(el.idToken.raw);

          const keylessAccountPub: KeylessAccountPublic = {
            idToken: el.idToken.raw,
            name: decodedIdToken.name,
            avatarUrl: decodedIdToken.picture,
          };

          return keylessAccountPub;
        }),
      );

      return {
        accountsList: [...walletAccounts, ...keylessAccountsData],
      };
    },
    { loadArgs: [] },
  );

  const {
    data: primaryTokenBalance,
    isLoading: isBalanceLoading,
    isLoadingError: isBalanceLoadingError,
    update,
  } = useLoading(
    0,
    (minimumLedgerVersion?: AnyNumber) => {
      return getPrimaryTokenBalance(selectedAccount, minimumLedgerVersion);
    },
    { loadArgs: [selectedAccount] },
  );

  const accountsLoadingState = useMemo((): LoadingState => {
    if (isAccountsLoading || isBalanceLoading) return 'loading';

    if (isAccountsLoadingError || isBalanceLoadingError) return 'error';

    return 'success';
  }, [
    isAccountsLoading,
    isAccountsLoadingError,
    isBalanceLoading,
    isBalanceLoadingError,
  ]);

  // TODO: implement adding keyless account for new tokens
  const addNewAccount = useCallback(
    (privateKeyHex?: string) => {
      const newPrivateKeyHex = privateKeyHex ?? walletStore.generatePrivateKeyHex();

      addAndSetPrivateKey(newPrivateKeyHex);
    },
    [addAndSetPrivateKey],
  );

  const setSelectedAccount = useCallback<
    ConfidentialCoinContextType['setSelectedAccount']
  >(
    async args => {
      if (args.pubKeylessAcc) {
        await switchActiveKeylessAccount(args.pubKeylessAcc.idToken);
        setSelectedAccountAddr('');

        return;
      }

      const accountToSet = accountsList
        .filter(el => el instanceof Account)
        .find(el => {
          return (
            el.accountAddress.toString().toLowerCase() ===
            args.accountAddressHex.toLowerCase()
          );
        });

      if (!accountToSet?.accountAddress) throw new TypeError('Account not found');

      if (
        walletAccounts.find(
          el =>
            el.accountAddress.toString().toLowerCase() ===
            accountToSet.accountAddress.toString().toLowerCase(),
        )
      ) {
        setSelectedAccountAddr(accountToSet?.accountAddress.toString());

        return;
      }
    },
    [accountsList, setSelectedAccountAddr, switchActiveKeylessAccount, walletAccounts],
  );

  // TODO: implement removing keyless accounts
  const removeAccount = useCallback(
    (accountAddressHex: string) => {
      const aptAccount = accountsList.filter(el => el instanceof Account);

      const currentAccountsListLength = accountsList.length;

      const filteredAccountsList = aptAccount.filter(
        el =>
          el.accountAddress.toString().toLowerCase() !==
          accountAddressHex.toLowerCase(),
      );

      if (
        currentAccountsListLength !== filteredAccountsList.length &&
        filteredAccountsList.length > 0
      ) {
        const accountToRemove = aptAccount.find(
          el =>
            el.accountAddress.toString().toLowerCase() ===
            accountAddressHex.toLowerCase(),
        );

        if (!accountToRemove?.accountAddress) throw new TypeError('Account not found');

        removeWalletAccount(accountToRemove.accountAddress.toString());
        setSelectedAccountAddr(filteredAccountsList[0].accountAddress.toString());
      }
    },
    [accountsList, removeWalletAccount, setSelectedAccountAddr],
  );

  return {
    accountsList: accountsList,

    selectedAccount,

    setSelectedAccount: setSelectedAccount,
    addNewAccount,
    removeAccount,

    primaryTokenBalance,

    accountsLoadingState,
    reloadPrimaryTokenBalance: update,
  };
};

const useSelectedAccountDecryptionKey = () => {
  const rawKeylessAccounts = authStore.useAuthStore(state => state.accounts);
  const activeKeylessAccount = authStore.useAuthStore(state => state.activeAccount);

  const selectedAccount = useSelectedAccount();

  const selectedAccountDecryptionKey = useMemo(() => {
    if (
      selectedAccount.accountAddress.toString().toLowerCase() ===
      activeKeylessAccount?.accountAddress.toString().toLowerCase()
    ) {
      return walletStore.decryptionKeyFromPepper(rawKeylessAccounts[0].pepper);
    }

    return walletStore.decryptionKeyFromPrivateKey(selectedAccount);
  }, [activeKeylessAccount?.accountAddress, rawKeylessAccounts, selectedAccount]);

  const registerAccountEncryptionKey = async (tokenAddress: string) => {
    return registerConfidentialBalance(
      selectedAccount,
      selectedAccountDecryptionKey.toString(),
      tokenAddress,
    );
  };

  return {
    selectedAccountDecryptionKey,
    registerAccountEncryptionKey,
  };
};

const useTokens = (accountAddressHex: string | undefined) => {
  const accountAddrHexToTokenAddrMap = walletStore.useWalletStore(
    state => state.accountAddrHexToTokenAddrMap,
  );
  const setSelectedTokenAddress = walletStore.useWalletStore(
    state => state.setSelectedTokenAddress,
  );
  const _addToken = walletStore.useWalletStore(state => state.addToken);
  const _removeToken = walletStore.useWalletStore(state => state.removeToken);

  const selectedTokenAddress = walletStore.useSelectedTokenAddress();

  const savedTokensPerAccAddr = useMemo(
    () =>
      accountAddressHex ? accountAddrHexToTokenAddrMap[accountAddressHex] || [] : [],
    [accountAddressHex, accountAddrHexToTokenAddrMap],
  );

  const {
    data: tokens,
    isLoading: isTokensLoading,
    isLoadingError: isTokensLoadingError,
  } = useLoading(
    [],
    async () => {
      const filteredSavedTokens = savedTokensPerAccAddr.filter(el => {
        return !appConfig.PRIMARY_TOKEN_ADDRESS.toLowerCase().includes(
          el.toLowerCase(),
        );
      });

      return Promise.all(
        [appConfig.PRIMARY_TOKEN_ADDRESS, ...filteredSavedTokens].map(async addr => {
          const [metadatas, error] = await tryCatch(getFungibleAssetMetadata(addr));
          if (error || !metadatas?.length) {
            return {
              address: addr,
              name: '',
              symbol: '',
              decimals: 0,
              iconUri: '',
            };
          }

          const [metadata] = metadatas;

          return {
            address: addr,
            name: metadata.name,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            iconUri: metadata.iconUri,
          };
        }),
      );
    },
    {
      loadArgs: [accountAddressHex, savedTokensPerAccAddr],
    },
  );

  const tokensLoadingState = useMemo<LoadingState>(() => {
    if (isTokensLoading) return 'loading';

    if (isTokensLoadingError) return 'error';

    return 'success';
  }, [isTokensLoading, isTokensLoadingError]);

  const selectedToken = useMemo<TokenBaseInfo>(() => {
    const defaultToken = {
      address: appConfig.PRIMARY_TOKEN_ADDRESS,
      name: '',
      symbol: '',
      decimals: 0,
      iconUri: '',
    };

    if (!accountAddressHex || !tokens.length) return defaultToken;

    return tokens.find(token => token.address === selectedTokenAddress) || defaultToken;
  }, [accountAddressHex, tokens, selectedTokenAddress]);

  const addToken = useCallback(
    (token: TokenBaseInfo) => {
      if (!accountAddressHex) throw new TypeError('accountAddressHex is not set');

      _addToken(accountAddressHex, token);
    },
    [_addToken, accountAddressHex],
  );

  const removeToken = useCallback(
    (address: string) => {
      if (!accountAddressHex) throw new TypeError('accountAddressHex is not set');

      _removeToken(accountAddressHex, address);
    },
    [accountAddressHex, _removeToken],
  );

  return {
    tokens,
    tokensLoadingState,
    selectedToken,
    setSelectedTokenAddress: setSelectedTokenAddress,
    addToken,
    removeToken,
  };
};

const useSelectedAccountDecryptionKeyStatus = (tokenAddress: string | undefined) => {
  const { selectedAccountDecryptionKey } = useSelectedAccountDecryptionKey();

  const selectedTokenAddress = walletStore.useSelectedTokenAddress();

  const selectedAccount = useSelectedAccount();

  const accountAddrHexToTokenAddrMap = walletStore.useWalletStore(
    state => state.accountAddrHexToTokenAddrMap,
  );

  const currentTokensList = useMemo(() => {
    if (!selectedAccount.accountAddress) return [];

    const savedTokensPerDK =
      accountAddrHexToTokenAddrMap?.[selectedAccount.accountAddress.toString()];

    if (!savedTokensPerDK?.length) {
      return [appConfig.PRIMARY_TOKEN_ADDRESS];
    }

    return [appConfig.PRIMARY_TOKEN_ADDRESS, ...savedTokensPerDK];
  }, [selectedAccount.accountAddress, accountAddrHexToTokenAddrMap]);

  const {
    data: loadedTokens,
    isLoading,
    isLoadingError,
    reload,
  } = useLoading(
    [
      {
        tokenAddress: appConfig.PRIMARY_TOKEN_ADDRESS,
        ...AccountDecryptionKeyStatusRawDefault,
      },
    ],
    async (minimumLedgerVersion?: AnyNumber) => {
      if (!selectedAccount.accountAddress || !currentTokensList.length) {
        return [
          {
            tokenAddress: appConfig.PRIMARY_TOKEN_ADDRESS,
            ...AccountDecryptionKeyStatusRawDefault,
          },
        ];
      }

      return Promise.all(
        currentTokensList.map(async el => {
          const [isRegistered, checkRegisterError] = await tryCatch(
            getIsAccountRegisteredWithToken(selectedAccount, el),
          );
          if (checkRegisterError) {
            return {
              tokenAddress: el,
              pending: undefined,
              available: undefined,
              isRegistered: false,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: '',
            };
          }

          const [coin] = await tryCatch(getCoinByFaAddress(el));

          const assetType = coin ? parseCoinTypeFromCoinStruct(coin) : el;

          const [fungibleAssetBalance, getFABalanceError] = await tryCatch(
            getFABalance(selectedAccount, assetType, minimumLedgerVersion),
          );
          if (getFABalanceError) {
            return {
              tokenAddress: el,
              pending: undefined,
              available: undefined,
              isRegistered,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: '',
            };
          }

          if (!isRegistered) {
            return {
              tokenAddress: el,
              pending: undefined,
              available: undefined,
              isRegistered,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: fungibleAssetBalance?.[0]?.amount,
            };
          }

          const [registeredDetails, getRegisteredDetailsError] = await tryCatch(
            Promise.all([
              getConfidentialBalances(
                selectedAccount,
                selectedAccountDecryptionKey.toString(),
                el,
              ),
              getIsBalanceNormalized(selectedAccount, el),
              getIsBalanceFrozen(selectedAccount, el),
            ]),
          );
          if (getRegisteredDetailsError) {
            return {
              tokenAddress: el,
              pending: undefined,
              available: undefined,
              isRegistered,
              isNormalized: false,
              isFrozen: false,
              fungibleAssetBalance: fungibleAssetBalance?.[0]?.amount,
            };
          }

          const [{ pending, available }, isNormalized, isFrozen] = registeredDetails;

          return {
            tokenAddress: el,
            pending,
            available,
            isRegistered,
            isNormalized,
            isFrozen,
            fungibleAssetBalance: fungibleAssetBalance?.[0]?.amount,
          };
        }),
      );
    },
    {
      loadArgs: [
        selectedTokenAddress,
        selectedAccount,
        currentTokensList,
        selectedAccountDecryptionKey,
      ],
    },
  );

  const perTokenStatusesRaw = useMemo(() => {
    const tokens =
      loadedTokens.length !== currentTokensList.length
        ? currentTokensList.map(el => ({
            ...AccountDecryptionKeyStatusRawDefault,
            tokenAddress: el,
          }))
        : loadedTokens;

    return tokens.reduce(
      (acc, { tokenAddress: tokenAddr, ...rest }) => {
        acc[tokenAddr] = rest;

        return acc;
      },
      {} as Record<
        string,
        {
          pending: EncryptedAmount | undefined;
          available: EncryptedAmount | undefined;
        } & Omit<AccountDecryptionKeyStatus, 'pendingAmount' | 'availableAmount'>
      >,
    );
  }, [currentTokensList, loadedTokens]);

  const perTokenStatuses = useMemo(() => {
    return Object.entries(perTokenStatusesRaw)
      .map<[string, AccountDecryptionKeyStatus]>(([key, value]) => {
        const { pending, available, ...rest } = value;

        return [
          key,
          {
            ...rest,
            pendingAmount: pending?.getAmount()?.toString(),
            availableAmount: available?.getAmount()?.toString(),
          } as AccountDecryptionKeyStatus,
        ];
      })
      .reduce(
        (acc, [key, value]) => {
          acc[key] = value;

          return acc;
        },
        {} as Record<string, AccountDecryptionKeyStatus>,
      );
  }, [perTokenStatusesRaw]);

  const selectedAccountDecryptionKeyStatusRaw = useMemo(() => {
    if (!perTokenStatusesRaw) return AccountDecryptionKeyStatusRawDefault;

    if (!tokenAddress) {
      return perTokenStatusesRaw[appConfig.PRIMARY_TOKEN_ADDRESS];
    }

    return perTokenStatusesRaw[tokenAddress];
  }, [perTokenStatusesRaw, tokenAddress]);

  const selectedAccountDecryptionKeyStatus = useMemo(() => {
    if (!perTokenStatuses) return AccountDecryptionKeyStatusDefault;

    if (!tokenAddress) return perTokenStatuses[appConfig.PRIMARY_TOKEN_ADDRESS];

    return perTokenStatuses[tokenAddress];
  }, [perTokenStatuses, tokenAddress]);

  const decryptionKeyStatusLoadingState = useMemo((): LoadingState => {
    if (isLoading) return 'loading';

    if (isLoadingError) return 'error';

    return 'success';
  }, [isLoading, isLoadingError]);

  const normalizeAccount = useCallback(async () => {
    if (!selectedAccountDecryptionKey || !tokenAddress)
      throw new TypeError('Decryption key is not set');

    return normalizeConfidentialBalance(
      selectedAccount,
      selectedAccountDecryptionKey.toString(),
      tokenAddress,
    );
  }, [selectedAccount, selectedAccountDecryptionKey, tokenAddress]);

  // FIXME: implement Promise<CommittedTransactionResponse>
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const unfreezeAccount = useCallback(async () => {
    if (!selectedAccountDecryptionKey) throw new TypeError('Decryption key is not set');

    // TODO: implement me
    // mb: rotate keys with unfreeze
  }, [selectedAccountDecryptionKey]);

  const rolloverAccount = useCallback(async () => {
    if (!selectedAccountDecryptionKey) throw new TypeError('Decryption key is not set');

    return rolloverConfidentialBalance(
      selectedAccount,
      selectedAccountDecryptionKey.toString(),
      tokenAddress,
    );
  }, [selectedAccountDecryptionKey, selectedAccount, tokenAddress]);

  return {
    perTokenStatusesRaw,
    perTokenStatuses,
    selectedAccountDecryptionKeyStatusRaw,
    selectedAccountDecryptionKeyStatus,

    decryptionKeyStatusLoadingState,
    loadSelectedDecryptionKeyState: async (minimumLedgerVersion?: AnyNumber) => {
      await reload(minimumLedgerVersion);
    },

    normalizeAccount,
    unfreezeAccount,
    rolloverAccount,
  };
};

export const ConfidentialCoinContextProvider = ({ children }: PropsWithChildren) => {
  const gasStationArgs = useGasStationArgs();

  const {
    accountsList,
    selectedAccount,
    setSelectedAccount,
    addNewAccount,
    removeAccount,
    primaryTokenBalance,
    reloadPrimaryTokenBalance,
    accountsLoadingState,
  } = useAccounts();

  const { selectedAccountDecryptionKey, registerAccountEncryptionKey } =
    useSelectedAccountDecryptionKey();

  const {
    tokens,
    tokensLoadingState,
    selectedToken,
    addToken,
    removeToken,
    setSelectedTokenAddress,
  } = useTokens(selectedAccount?.accountAddress.toString());

  const {
    perTokenStatuses,
    decryptionKeyStatusLoadingState,
    selectedAccountDecryptionKeyStatus,
    loadSelectedDecryptionKeyState,
    normalizeAccount,
    unfreezeAccount,
    rolloverAccount,
  } = useSelectedAccountDecryptionKeyStatus(selectedToken.address);

  const transfer = useCallback(
    async (
      receiverAddressHex: string,
      amount: string,
      opts?: {
        auditorsEncryptionKeyHexList?: string[];
        isSyncFirst?: boolean;
      },
    ) => {
      return transferConfidentialAsset(
        selectedAccount,
        selectedAccountDecryptionKey.toString(),
        BigInt(amount),
        receiverAddressHex,
        opts?.auditorsEncryptionKeyHexList ?? [],
        selectedToken.address,
      );
    },
    [selectedAccount, selectedAccountDecryptionKey, selectedToken.address],
  );

  const withdrawTo = useCallback(
    async (amount: string, receiver: string) => {
      return withdrawConfidentialBalance(
        selectedAccount,
        receiver,
        selectedAccountDecryptionKey.toString(),
        BigInt(amount),
        selectedToken.address,
      );
    },
    [selectedAccount, selectedAccountDecryptionKey, selectedToken.address],
  );

  const buildDepositToTx = useCallback(
    async (amount: bigint, to: string) => {
      if (!selectedToken) throw new TypeError('Token is not set');

      return buildDepositConfidentialBalanceTx(
        selectedAccount,
        amount,
        to,
        gasStationArgs,
        selectedToken.address,
      );
    },
    [selectedAccount, selectedToken, gasStationArgs],
  );

  const depositTo = useCallback(
    async (amount: bigint, to: string) => {
      if (!selectedToken) throw new TypeError('Token is not set');

      return depositConfidentialBalance(
        selectedAccount,
        amount,
        to,
        selectedToken.address,
      );
    },
    [selectedAccount, selectedToken],
  );

  const buildDepositCoinToTx = useCallback(
    async (amount: bigint, to: string) => {
      const coinType = await getCoinByFaAddress(selectedToken.address);

      return buildDepositConfidentialBalanceCoinTx(
        selectedAccount,
        amount,
        parseCoinTypeFromCoinStruct(coinType),
        gasStationArgs,
        to,
      );
    },
    [selectedAccount, selectedToken.address, gasStationArgs],
  );

  const depositCoinTo = useCallback(
    async (amount: bigint, to: string) => {
      return depositConfidentialBalanceCoin(
        selectedAccount,
        amount,
        selectedToken.address,
        to,
      );
    },
    [selectedAccount, selectedToken.address],
  );

  const testMintTokens = useCallback(
    async (mintAmount = '10'): Promise<CommittedTransactionResponse[]> => {
      const amountToDeposit = parseUnits(mintAmount, selectedToken.decimals);

      const mintTxReceipt = await mintPrimaryToken(
        selectedAccount,
        amountToDeposit,
        gasStationArgs,
      );
      const [depositTxReceipt, depositError] = await tryCatch(
        depositTo(amountToDeposit, selectedAccount.accountAddress.toString()),
      );
      if (depositError) {
        ErrorHandler.processWithoutFeedback(depositError);
        return [mintTxReceipt];
      }

      return [mintTxReceipt, depositTxReceipt];
    },
    [depositTo, selectedAccount, selectedToken.decimals, gasStationArgs],
  );

  /**
   * emulating-a-fee-payer-via-devnet-faucet
   * Ensures that the confidential balance is ready before performing an operation.
   *
   * 1. Checks if the confidential balance is enough for the operation
   * 2. Implement "emulating-a-fee-payer-via-devnet-faucet" logic
   * 3. Deposit whole public balance except the fee, that was emulated
   * 4. Rollover the account if there is not enough "available" amount in user's balance
   */
  const ensureConfidentialBalanceReadyBeforeOp = useCallback<
    ConfidentialCoinContextType['ensureConfidentialBalanceReadyBeforeOp']
  >(
    async args => {
      let depositTransactionToExecute: SimpleTransaction | undefined = undefined;

      const publicBalanceBN = BigInt(
        perTokenStatuses[args.token.address].fungibleAssetBalance || 0,
      );

      const pendingAmountBN = BigInt(args.currentTokenStatus.pendingAmount || 0);

      const availableAmountBN = BigInt(args.currentTokenStatus?.availableAmount || 0);

      const confidentialAmountsSumBN = pendingAmountBN + availableAmountBN;

      const formAmountBN = parseUnits(args.amountToEnsure, args.token.decimals);

      const isConfidentialBalanceEnough = confidentialAmountsSumBN - formAmountBN >= 0;

      if (!isConfidentialBalanceEnough) {
        // const amountToDeposit = formAmountBN - confidentialAmountsSumBN
        const amountToDeposit = publicBalanceBN;

        const [faOnlyBalanceResponse, getFAError] = await tryCatch(
          getFABalance(selectedAccount, args.token.address),
        );
        if (getFAError) {
          return getFAError;
        }
        const [faOnlyBalance] = faOnlyBalanceResponse;

        const isInsufficientFAOnlyBalance = FixedNumber.fromValue(
          faOnlyBalance?.amount || '0',
        ).lt(FixedNumber.fromValue(amountToDeposit));

        const [depositTx, buildDepositTxError] = await tryCatch(
          isInsufficientFAOnlyBalance
            ? buildDepositCoinToTx(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              )
            : buildDepositToTx(
                amountToDeposit,
                selectedAccount.accountAddress.toString(),
              ),
        );
        if (buildDepositTxError) {
          return buildDepositTxError;
        }
        depositTransactionToExecute = depositTx;
      }

      if (depositTransactionToExecute) {
        const [, error] = await tryCatch(
          sendAndWaitTx(depositTransactionToExecute, selectedAccount, gasStationArgs),
        );
        if (error) {
          return error;
        }
      }
    },
    [
      buildDepositCoinToTx,
      buildDepositToTx,
      perTokenStatuses,
      selectedAccount,
      gasStationArgs,
    ],
  );

  /*
  Re-enable once this is fixed:
  https://aptos-org.slack.com/archives/C07G7CT4AV6/p1746541487923559?thread_ts=1746523176.634849&cid=C07G7CT4AV6
  // If we see that the balance isn't normalized, let's do that.
  useHarmonicIntervalFn(async () => {
    const currTokenStatus = perTokenStatuses[selectedToken.address];
    if (currTokenStatus.isNormalized) return;
    console.log('Normalizing account...');
    try {
      await normalizeAccount();
      console.log('Successfully normalized account.');
    } catch (error) {
      console.error('Error normalizing account:', error);
    }
  }, 5_000);
  */

  const reloadBalances = useCallback(
    async (minimumLedgerVersion?: bigint) => {
      // TODO: We could optimize this by just manually calling waitForIndexer
      // first before then doing these other functions, otherwise both of them
      // will wait for the indexer to catch up.
      const min = minimumLedgerVersion ? minimumLedgerVersion + 1n : undefined;
      await Promise.all([
        reloadPrimaryTokenBalance(min),
        loadSelectedDecryptionKeyState(min),
      ]);
    },
    [reloadPrimaryTokenBalance, loadSelectedDecryptionKeyState],
  );

  return (
    <confidentialCoinContext.Provider
      value={{
        accountsList,

        selectedAccount,

        setSelectedAccount,
        addNewAccount,
        removeAccount,
        accountsLoadingState,

        primaryTokenBalance,
        reloadPrimaryTokenBalance,
        reloadBalances,

        tokens,
        tokensLoadingState,
        perTokenStatuses,
        selectedToken,
        addToken,
        removeToken,
        setSelectedTokenAddress,

        selectedAccountDecryptionKey,
        registerAccountEncryptionKey,
        normalizeAccount,

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        unfreezeAccount,

        rolloverAccount,
        transfer,
        withdrawTo,
        depositTo,
        depositCoinTo,

        selectedAccountDecryptionKeyStatus,
        decryptionKeyStatusLoadingState,
        loadSelectedDecryptionKeyState,

        testMintTokens,
        ensureConfidentialBalanceReadyBeforeOp,
      }}
    >
      {children}
    </confidentialCoinContext.Provider>
  );
};
