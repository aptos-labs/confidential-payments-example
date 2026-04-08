import {
  TwistedEd25519PrivateKey,
  TwistedEd25519PublicKey,
} from '@aptos-labs/confidential-assets';
import {
  TwistedEd25519PrivateKey as NewTwistedEd25519PrivateKey,
  TwistedEd25519PublicKey as NewTwistedEd25519PublicKey,
} from '@aptos-labs/confidential-asset';
import {
  Account,
  AccountAddress,
  AnyNumber,
  type CommittedTransactionResponse,
  Ed25519PrivateKey,
  EphemeralKeyPair,
  GetFungibleAssetMetadataResponse,
  KeylessAccount,
  MoveStructId,
  MoveValue,
  PrivateKey,
  PrivateKeyVariants,
  SimpleTransaction,
} from '@aptos-labs/ts-sdk';
import { BN, time } from '@distributedlab/tools';
import { sha256 } from '@noble/hashes/sha256';
import { ethers, isHexString } from 'ethers';
import { jwtDecode } from 'jwt-decode';
import { z } from 'zod';

import { appConfig, ASSET_CONFIG, PRIMARY_ASSET } from '@/config';
import { GasStationArgs } from '@/store/gas-station';
import { type TokenBaseInfo } from '@/store/wallet';

import { aptos, confidentialAsset, confidentialAssets } from './client';

export const accountFromPrivateKey = (privateKeyHex: string) => {
  const sanitizedPrivateKeyHex = privateKeyHex.startsWith('0x')
    ? privateKeyHex.slice(2)
    : privateKeyHex;

  return Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(
      PrivateKey.formatPrivateKey(sanitizedPrivateKeyHex, PrivateKeyVariants.Ed25519),
    ),
  });
};

export function deriveEd25519PrivateKey(
  login: string,
  password: string,
  salt: string | null = null,
) {
  // Generate or use provided salt
  const saltBytes = salt
    ? ethers.hexlify(ethers.toUtf8Bytes(salt))
    : ethers.randomBytes(32);

  // Combine login and password
  const combined = `${login}:${password}`;

  // Derive key using PBKDF2
  const derivedKey = ethers.pbkdf2(
    Buffer.from(combined),
    saltBytes,
    100000,
    32,
    'sha256',
  );

  return ethers.hexlify(derivedKey);
}

export const validatePrivateKeyHex = (privateKeyHex: string) => {
  try {
    const account = accountFromPrivateKey(privateKeyHex);

    return Boolean(account.accountAddress.toString());
  } catch (error) {
    return false;
  }
};

export const validateEncryptionKeyHex = (encryptionKeyHex: string) => {
  try {
    const encryptionKey = new TwistedEd25519PublicKey(encryptionKeyHex);

    return Boolean(encryptionKey.toString());
  } catch (error) {
    return false;
  }
};

export const decryptionKeyFromPrivateKey = (account: Account) => {
  const signature = account.sign(
    NewTwistedEd25519PrivateKey.decryptionKeyDerivationMessage,
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return NewTwistedEd25519PrivateKey.fromSignature(signature);
};

export const decryptionKeyFromPepper = (pepper: Uint8Array) => {
  const bytes = ethers.getBytes(ethers.zeroPadBytes(pepper, 32));

  const hashDigest = sha256(bytes);

  return new NewTwistedEd25519PrivateKey(hashDigest);
};

export const sendTransaction = async (
  transaction: SimpleTransaction,
  signer: Account,
  gasStationArgs: GasStationArgs,
) => {
  if (!gasStationArgs.withGasStation) {
    throw new Error('We only support gas station for now.');
  }

  const senderAuth = signer.signTransactionWithAuthenticator(transaction);

  const response = await gasStationArgs.gasStationClient.simpleSignAndSubmitTransaction(
    transaction,
    senderAuth,
  );

  if (response.error !== undefined || response.data === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = response.error as any;
    const errorInner = err.error;
    const statusCode = err.statusCode;
    const message = err.message;
    throw new Error(
      `[${statusCode}] Error signing and submitting transaction for sender ${transaction.rawTransaction.sender} (seq num: ${transaction.rawTransaction.sequence_number}): ${errorInner} ${message}`,
    );
  }
  return response.data.transactionHash;
};

export const sendAndWaitTx = async (
  transaction: SimpleTransaction,
  signer: Account,
  gasStationArgs: GasStationArgs,
): Promise<CommittedTransactionResponse> => {
  const transactionHash = await sendTransaction(transaction, signer, gasStationArgs);

  return aptos.waitForTransaction({ transactionHash });
};

// Only works for USDT - calls the on-chain faucet.
export const mintUsdt = async (
  account: Account,
  amount: bigint,
  gasStationArgs: GasStationArgs,
) => {
  const mintFunction = ASSET_CONFIG.usdt.mintFunction;
  const tx = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: mintFunction,
      functionArguments: [amount],
    },
    withFeePayer: gasStationArgs.withGasStation,
  });

  return sendAndWaitTx(tx, account, gasStationArgs);
};

// Get external faucet URL for assets that don't have on-chain minting (e.g. APT).
export const getExternalFaucetUrl = (address: string): string | null => {
  const config = ASSET_CONFIG[PRIMARY_ASSET];
  return config.faucetUrl ? config.faucetUrl(address) : null;
};

// Get the unified balance for an account using the node API.
// This handles both Coin and FA balances automatically via the unified endpoint.
export const getUnifiedBalance = async (
  accountAddress: string,
  asset: string,
): Promise<bigint> => {
  const network = aptos.config.network;
  const baseUrl =
    network === 'testnet'
      ? 'https://api.testnet.aptoslabs.com/v1'
      : network === 'mainnet'
        ? 'https://api.mainnet.aptoslabs.com/v1'
        : 'https://api.devnet.aptoslabs.com/v1';

  const response = await fetch(
    `${baseUrl}/accounts/${accountAddress}/balance/${asset}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch balance: ${response.statusText}`);
  }
  const balance = await response.json();
  return BigInt(balance);
};

export const withdrawConfidentialBalance = async (
  account: Account,
  receiver: string,
  decryptionKeyHex: string,
  withdrawAmount: bigint,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.withdrawWithTotalBalance({
    signer: account,
    recipient: receiver,
    tokenAddress,
    senderDecryptionKey: new NewTwistedEd25519PrivateKey(decryptionKeyHex),
    amount: withdrawAmount,
  });
};

export const getEncryptionKey = async (addrHex: string, tokenAddress: string) => {
  return confidentialAsset.getEncryptionKey({
    accountAddress: AccountAddress.from(addrHex),
    tokenAddress,
  });
};

export const transferConfidentialAsset = async (
  account: Account,
  decryptionKeyHex: string,
  amountToTransfer: bigint,
  recipientAddressHex: string,
  auditorsEncryptionKeyHexList: string[],
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
): Promise<CommittedTransactionResponse[]> => {
  return confidentialAsset.transferWithTotalBalance({
    signer: account,
    recipient: recipientAddressHex,
    tokenAddress,
    senderDecryptionKey: new NewTwistedEd25519PrivateKey(decryptionKeyHex),
    amount: amountToTransfer,
    additionalAuditorEncryptionKeys: auditorsEncryptionKeyHexList.map(
      hex => new NewTwistedEd25519PublicKey(hex),
    ),
  });
};

export const rotateEncryptionKey = async (
  account: Account,
  decryptionKeyHex: string,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  const newDecryptionKey = TwistedEd25519PrivateKey.generate();

  return confidentialAssets.rotateEncryptionKey({
    signer: account,
    tokenAddress,
    senderDecryptionKey: new TwistedEd25519PrivateKey(decryptionKeyHex),
    newSenderDecryptionKey: newDecryptionKey,
  });
};

export const rolloverConfidentialBalance = async (
  account: Account,
  decryptionKeyHex: string,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  const decryptionKey = new TwistedEd25519PrivateKey(decryptionKeyHex);
  return confidentialAssets.rolloverPendingBalance({
    signer: account,
    tokenAddress,
    senderDecryptionKey: decryptionKey,
  });
};

export const createAccount = async (
  account: Account,
  gasStationArgs: GasStationArgs,
) => {
  const txn = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: '0x1::aptos_account::create_account',
      functionArguments: [account.accountAddress.toStringLong()],
    },
    withFeePayer: gasStationArgs.withGasStation,
  });

  return sendAndWaitTx(txn, account, gasStationArgs);
};

export const buildRegisterConfidentialBalanceTx = async (
  account: Account,
  decryptionKeyHex: string,
  gasStationArgs: GasStationArgs,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.transaction.registerBalance({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    decryptionKey: new NewTwistedEd25519PrivateKey(decryptionKeyHex),
    withFeePayer: gasStationArgs.withGasStation,
  });
};

export const registerConfidentialBalance = async (
  account: Account,
  privateKeyHex: string,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.registerBalance({
    signer: account,
    tokenAddress,
    decryptionKey: new NewTwistedEd25519PrivateKey(privateKeyHex),
  });
};

export const normalizeConfidentialBalance = async (
  account: Account,
  decryptionKeyHex: string,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAssets.normalizeBalance({
    signer: account,
    tokenAddress,
    senderDecryptionKey: new TwistedEd25519PrivateKey(decryptionKeyHex),
  });
};

export const buildDepositConfidentialBalanceTx = async (
  account: Account,
  amount: bigint,
  _to: string,
  gasStationArgs: GasStationArgs,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.transaction.deposit({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    amount: amount,
    withFeePayer: gasStationArgs.withGasStation,
  });
};

export const depositConfidentialBalance = async (
  account: Account,
  amount: bigint,
  recipient: string,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.deposit({
    signer: account,
    tokenAddress,
    amount,
    recipient,
  });
};

export const buildDepositConfidentialBalanceCoinTx = async (
  account: Account,
  amount: bigint,
  tokenAddress: string,
  gasStationArgs: GasStationArgs,
  _to?: string,
) => {
  return confidentialAsset.transaction.deposit({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    amount: amount,
    withFeePayer: gasStationArgs.withGasStation,
  });
};

export const depositConfidentialBalanceCoin = async (
  account: Account,
  amount: bigint,
  tokenAddress: string,
  recipient?: string,
) => {
  return confidentialAsset.deposit({
    signer: account,
    tokenAddress,
    amount,
    recipient,
  });
};

export const getIsAccountRegisteredWithToken = async (
  account: Account,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.hasUserRegistered({
    accountAddress: account.accountAddress,
    tokenAddress,
  });
};

export const getIsBalanceNormalized = async (
  account: Account,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.isBalanceNormalized({
    accountAddress: account.accountAddress,
    tokenAddress,
  });
};

export const getIsBalanceFrozen = async (
  account: Account,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  return confidentialAsset.isIncomingTransfersPaused({
    accountAddress: account.accountAddress,
    tokenAddress,
  });
};

export const getCoinByFaAddress = async (
  tokenAddress: string,
): Promise<{
  account_address: string;
  module_name: string;
  struct_name: string;
}> => {
  const pairedCoinTypeStruct = (
    await aptos.view({
      payload: {
        function: '0x1::coin::paired_coin',
        functionArguments: [tokenAddress],
      },
    })
  ).at(0) as { vec: MoveValue[] };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return pairedCoinTypeStruct.vec[0];
};

export const parseCoinTypeFromCoinStruct = (coinStruct: {
  account_address: string;
  module_name: string;
  struct_name: string;
}): MoveStructId => {
  const moduleNameUtf8 = ethers.toUtf8String(coinStruct.module_name);
  const structNameUtf8 = ethers.toUtf8String(coinStruct.struct_name);

  return `${coinStruct.account_address}::${moduleNameUtf8}::${structNameUtf8}`;
};

export const getFAByCoinType = async (coinType: string): Promise<string> => {
  const fungibleAsset = (
    await aptos.view({
      payload: {
        function: '0x1::coin::paired_metadata',
        typeArguments: [coinType],
      },
    })
  ).at(0) as { vec: { inner: string }[] };

  return fungibleAsset?.vec[0].inner;
};

export const getCoinBalanceByFaAddress = (
  account: Account,
  tokenAddress: string,
  minimumLedgerVersion?: AnyNumber,
) => {
  return aptos.account.getAccountCoinAmount({
    accountAddress: account.accountAddress,
    faMetadataAddress: tokenAddress,
    minimumLedgerVersion,
  });
};

/*
export const getAptBalance = async (account: Account) => {
  const aptBalance = await aptos.getAccountAPTAmount({
    accountAddress: account.accountAddress,
  });

  return aptBalance;
};
*/

export const getPrimaryTokenBalance = async (
  account: Account,
  minimumLedgerVersion?: AnyNumber,
) => {
  const primaryTokenBalance = await aptos.getAccountCoinAmount({
    accountAddress: account.accountAddress,
    faMetadataAddress: appConfig.PRIMARY_TOKEN_ADDRESS,
    minimumLedgerVersion,
  });

  return primaryTokenBalance;
};

export const getConfidentialBalances = async (
  account: Account,
  decryptionKeyHex: string,
  tokenAddress = appConfig.PRIMARY_TOKEN_ADDRESS,
) => {
  try {
    const balance = await confidentialAsset.getBalance({
      accountAddress: account.accountAddress,
      tokenAddress,
      decryptionKey: new NewTwistedEd25519PrivateKey(decryptionKeyHex),
    });

    return {
      pending: balance.pendingBalance(),
      available: balance.availableBalance(),
    };
  } catch (error) {
    console.error('Error getting confidential balances', error);
    throw error;
  }
};

export const generatePrivateKeyHex = () => {
  const account = Account.generate();

  return account.privateKey.toString();
};

export const getFungibleAssetMetadata = async (
  tokenNameOrSymbolOrAddressHex: string,
): Promise<TokenBaseInfo[]> => {
  const isHex = isHexString(tokenNameOrSymbolOrAddressHex);

  const searchByHexPromise = isHex
    ? aptos.getFungibleAssetMetadata({
        options: {
          where: {
            asset_type: {
              _ilike:
                tokenNameOrSymbolOrAddressHex.length === 3
                  ? `%0x${tokenNameOrSymbolOrAddressHex.replace('0x', '').padStart(64, '0')}%`
                  : `%${tokenNameOrSymbolOrAddressHex}%`,
            },
          },
        },
      })
    : undefined;

  const searchByNamePromise = isHex
    ? undefined
    : aptos.getFungibleAssetMetadata({
        options: {
          where: {
            name: {
              _ilike: `%${tokenNameOrSymbolOrAddressHex}%`,
            },
          },
        },
      });

  const searchBySymbolPromise = isHex
    ? undefined
    : aptos.getFungibleAssetMetadata({
        options: {
          where: {
            symbol: {
              _ilike: `%${tokenNameOrSymbolOrAddressHex}%`,
            },
          },
        },
      });

  const searchResults = await Promise.all([
    searchByHexPromise,
    searchByNamePromise,
    searchBySymbolPromise,
  ]);

  const filteredUniqueFungibleAssets = searchResults.flat().reduce((acc, el) => {
    if (!acc.find(accEl => accEl.asset_type === el?.asset_type) && el) {
      acc.push(el);
    }

    return acc;
  }, [] as GetFungibleAssetMetadataResponse);

  return filteredUniqueFungibleAssets.map(el => ({
    address: el.asset_type,
    name: el.name,
    symbol: el.symbol,
    decimals: el.decimals,
    iconUri: el.icon_uri || '',
  }));
};

export const getFABalance = async (
  account: Account,
  tokenAddressHex: string,
  minimumLedgerVersion?: AnyNumber,
) => {
  return aptos.fungibleAsset.getCurrentFungibleAssetBalances({
    options: {
      where: {
        owner_address: {
          _eq: account.accountAddress.toString(),
        },
        asset_type: {
          _eq: tokenAddressHex,
        },
      },
    },
    // We pass this to ensure that the indexer has synced up to the point where the
    // changes we made have been indexed.
    minimumLedgerVersion,
  });
};

export const sendPrimaryToken = async (
  account: Account,
  receiverAccountAddressHex: string,
  humanAmount: string,
  gasStationArgs: GasStationArgs,
) => {
  const amount = BN.fromRaw(humanAmount, 8).value;

  const sendPrimaryTokenTransaction = await aptos.fungibleAsset.transferFungibleAsset({
    sender: account,
    fungibleAssetMetadataAddress: appConfig.PRIMARY_TOKEN_ADDRESS,
    recipient: receiverAccountAddressHex,
    amount: BigInt(amount),
  });

  return sendAndWaitTx(sendPrimaryTokenTransaction, account, gasStationArgs);
};

// =========================================================================
// Keyless helpers
// =========================================================================

export const EphemeralKeyPairEncoding = {
  /* eslint-disable-next-line */
  decode: (e: any) => EphemeralKeyPair.fromBytes(e.data),
  encode: (e: EphemeralKeyPair) => ({
    __type: 'EphemeralKeyPair',
    data: e.bcsToBytes(),
  }),
};

export const validateEphemeralKeyPair = (
  keyPair: EphemeralKeyPair,
): EphemeralKeyPair | undefined =>
  isValidEphemeralKeyPair(keyPair) ? keyPair : undefined;

export const isValidEphemeralKeyPair = (keyPair: EphemeralKeyPair): boolean => {
  if (keyPair.isExpired()) return false;
  return true;
};

/**
 * Create a new ephemeral key pair with a random private key and nonce.
 *
 * @param params Additional parameters for the ephemeral key pair
 */
export const createEphemeralKeyPair = ({
  expiryDateSecs = time().add(1, 'day').timestamp,
  privateKey = Ed25519PrivateKey.generate(),
  ...options
}: Partial<ConstructorParameters<typeof EphemeralKeyPair>[0]> = {}) =>
  new EphemeralKeyPair({ expiryDateSecs, privateKey, ...options });

export const idTokenSchema = z.object({
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string(),
  sub: z.string(),
});

export const nonceEncryptedIdTokenSchema = idTokenSchema.extend({
  nonce: z.string(),
});

export const profileScopedPayloadSchema = nonceEncryptedIdTokenSchema.extend({
  family_name: z.string().optional(),
  given_name: z.string().optional(),
  locale: z.string().optional(),
  name: z.string(),
  picture: z.string().optional(),
});

export const emailScopedPayloadSchema = nonceEncryptedIdTokenSchema.extend({
  email: z.string().optional(),
  email_verified: z.boolean(),
});

export const scopedPayloadSchema = profileScopedPayloadSchema.merge(
  emailScopedPayloadSchema,
);

export type IDToken = z.infer<typeof idTokenSchema>;

export type NonceEncryptedIdToken = z.infer<typeof nonceEncryptedIdTokenSchema>;

export type ProfileScopedPayloadSchema = z.infer<typeof profileScopedPayloadSchema>;

export type EmailScopedPayloadSchema = z.infer<typeof emailScopedPayloadSchema>;

export type EncryptedScopedIdToken = z.infer<typeof scopedPayloadSchema>;

export const decodeIdToken = (jwt: string): EncryptedScopedIdToken =>
  scopedPayloadSchema.parse(jwtDecode(jwt));

export const isValidIdToken = (jwt: string | EncryptedScopedIdToken): boolean => {
  if (typeof jwt === 'string') return isValidIdToken(decodeIdToken(jwt));

  // Check whether the token has an expiration, nonce, and is not expired
  if (!jwt.nonce) return false;

  return true;
};

export const validateIdToken = (
  jwt: string | EncryptedScopedIdToken,
): EncryptedScopedIdToken | null => {
  if (typeof jwt === 'string') return validateIdToken(decodeIdToken(jwt));
  return isValidIdToken(jwt) ? jwt : null;
};

/**
 * Encoding for the KeylessAccount class to be stored in localStorage
 */
export const KeylessAccountEncoding = {
  /* eslint-disable-next-line */
  decode: (e: any) => KeylessAccount.fromBytes(e.data),
  // If the account has a proof, it can be persisted, otherwise,
  // it should not be stored.
  encode: (e: KeylessAccount) =>
    e.proof
      ? {
          __type: 'KeylessAccount',
          data: e.bcsToBytes(),
        }
      : undefined,
};

/**
 * If the account has an invalid Ephemeral key pair or idToken, the account needs to be refreshed with either
 * a new nonce or idToken. If the account is valid, it is returned.
 *
 * @param account - The account to validate.
 * @returns The account if it is valid, otherwise undefined.
 */
export const validateKeylessAccount = (
  account: KeylessAccount,
): KeylessAccount | undefined => {
  // Check the Ephemeral key pair expiration
  return isValidEphemeralKeyPair(account.ephemeralKeyPair) &&
    // Check the idToken for nonce
    isValidIdToken(account.jwt) &&
    // If the EphemeralAccount nonce algorithm changes, this will need to be updated
    decodeIdToken(account.jwt).nonce === account.ephemeralKeyPair.nonce
    ? account
    : undefined;
};

export const getTxExplorerUrl = (txHash: string) => {
  const network = aptos.config.network;

  return `https://explorer.aptoslabs.com/txn/${txHash}?network=${network}`;
};

export const getAccountExplorerUrl = (accountAddressHex: string) => {
  const network = aptos.config.network;

  return `https://explorer.aptoslabs.com/account/${accountAddressHex}?network=${network}`;
};
