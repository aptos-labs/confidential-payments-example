import { BN } from '@distributedlab/tools'
import {
  Account,
  AccountAddress,
  type AnyRawTransaction,
  Aptos,
  AptosConfig,
  type CommittedTransactionResponse,
  ConfidentialAmount,
  ConfidentialCoin,
  Ed25519PrivateKey,
  EphemeralKeyPair,
  GetFungibleAssetMetadataResponse,
  type InputGenerateTransactionPayloadData,
  KeylessAccount,
  MoveStructId,
  MoveValue,
  Network,
  NetworkToNetworkName,
  PrivateKey,
  PrivateKeyVariants,
  RangeProofExecutor,
  TransactionWorkerEventsEnum,
  TwistedEd25519PrivateKey,
  TwistedEd25519PublicKey,
  type TwistedElGamalCiphertext,
} from '@lukachi/aptos-labs-ts-sdk'
import { sha256 } from '@noble/hashes/sha256'
import { ethers, isHexString } from 'ethers'
import { jwtDecode } from 'jwt-decode'
import { z } from 'zod'

import {
  genBatchRangeZKP,
  generateRangeZKP,
  verifyBatchRangeZKP,
  verifyRangeZKP,
} from '@/api/modules/aptos/wasmRangeProof'
import { config as appConfig } from '@/config'
import { type TokenBaseInfo } from '@/store/wallet'

ConfidentialCoin.setConfidentialCoinModuleAddress(
  appConfig.CONFIDENTIAL_ASSET_MODULE_ADDR,
)

RangeProofExecutor.setGenBatchRangeZKP(genBatchRangeZKP)
RangeProofExecutor.setVerifyBatchRangeZKP(verifyBatchRangeZKP)
RangeProofExecutor.setGenerateRangeZKP(generateRangeZKP)
RangeProofExecutor.setVerifyRangeZKP(verifyRangeZKP)

const config = new AptosConfig({
  network: NetworkToNetworkName[Network.DEVNET],
})
export const aptos = new Aptos(config)

export const accountFromPrivateKey = (privateKeyHex: string) => {
  const sanitizedPrivateKeyHex = privateKeyHex.startsWith('0x')
    ? privateKeyHex.slice(2)
    : privateKeyHex

  return Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(
      PrivateKey.formatPrivateKey(
        sanitizedPrivateKeyHex,
        PrivateKeyVariants.Ed25519,
      ),
    ),
  })
}

export function deriveEd25519PrivateKey(
  login: string,
  password: string,
  salt: string | null = null,
) {
  // Generate or use provided salt
  const saltBytes = salt
    ? ethers.hexlify(ethers.toUtf8Bytes(salt))
    : ethers.randomBytes(32)

  // Combine login and password
  const combined = `${login}:${password}`

  // Derive key using PBKDF2
  const derivedKey = ethers.pbkdf2(
    Buffer.from(combined),
    saltBytes,
    100000,
    32,
    'sha256',
  )

  return ethers.hexlify(derivedKey)
}

export const validatePrivateKeyHex = (privateKeyHex: string) => {
  try {
    const account = accountFromPrivateKey(privateKeyHex)

    return Boolean(account.accountAddress.toString())
  } catch (error) {
    return false
  }
}

export const validateEncryptionKeyHex = (encryptionKeyHex: string) => {
  try {
    const encryptionKey = new TwistedEd25519PublicKey(encryptionKeyHex)

    return Boolean(encryptionKey.toString())
  } catch (error) {
    return false
  }
}

export const decryptionKeyFromPrivateKey = (account: Account) => {
  const signature = account.sign(
    TwistedEd25519PrivateKey.decryptionKeyDerivationMessage,
  )

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return TwistedEd25519PrivateKey.fromSignature(signature)
}

export const decryptionKeyFromPepper = (pepper: Uint8Array) => {
  const bytes = ethers.getBytes(ethers.zeroPadBytes(pepper, 32))

  const hashDigest = sha256(bytes)

  return new TwistedEd25519PrivateKey(hashDigest)
}

export const sendAndWaitTx = async (
  transaction: AnyRawTransaction,
  signer: Account,
): Promise<CommittedTransactionResponse> => {
  const pendingTxn = await aptos.signAndSubmitTransaction({
    signer,
    transaction,
  })
  return aptos.waitForTransaction({ transactionHash: pendingTxn.hash })
}

export const sendAndWaitBatchTxs = async (
  txPayloads: InputGenerateTransactionPayloadData[],
  sender: Account,
): Promise<CommittedTransactionResponse[]> => {
  aptos.transaction.batch.forSingleAccount({
    sender,
    data: txPayloads,
  })

  let allTxSentPromiseResolve: (value: void | PromiseLike<void>) => void

  const txHashes: string[] = []
  aptos.transaction.batch.on(
    TransactionWorkerEventsEnum.TransactionSent,
    async data => {
      txHashes.push(data.transactionHash)

      if (txHashes.length === txPayloads.length) {
        allTxSentPromiseResolve()
      }
    },
  )

  await new Promise<void>(resolve => {
    allTxSentPromiseResolve = resolve
  })

  return Promise.all(
    txHashes.map(txHash =>
      aptos.waitForTransaction({ transactionHash: txHash }),
    ),
  )
}

export const getModuleMockedTokenAddr = async () => {
  const [vec] = await aptos.view<
    [
      {
        inner: string
      },
    ]
  >({
    payload: {
      function: `${ConfidentialCoin.CONFIDENTIAL_COIN_MODULE_ADDRESS}::mock_token::get_token_metadata`,
    },
  })

  return vec.inner
}

export const mintTokens = async (account: Account) => {
  const tx = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${ConfidentialCoin.CONFIDENTIAL_COIN_MODULE_ADDRESS}::mock_token::mint_to`,
      functionArguments: [10],
    },
  })

  return sendAndWaitTx(tx, account)
}

export const withdrawConfidentialBalance = async (
  account: Account,
  decryptionKeyHex: string,
  withdrawAmount: bigint,
  encryptedActualBalance: TwistedElGamalCiphertext[],
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const decryptionKey = new TwistedEd25519PrivateKey(decryptionKeyHex)

  const withdrawTx = await aptos.confidentialCoin.withdraw({
    sender: account.accountAddress,
    tokenAddress,
    decryptionKey: decryptionKey,
    encryptedActualBalance,
    amountToWithdraw: withdrawAmount,
  })

  return sendAndWaitTx(withdrawTx, account)
}

export const transferConfidentialCoin = async (
  account: Account,
  decryptionKeyHex: string,
  encryptedActualBalance: TwistedElGamalCiphertext[],
  amountToTransfer: bigint,
  recipientAddressHex: string,
  auditorsEncryptionKeyHexList: string[],
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const decryptionKey = new TwistedEd25519PrivateKey(decryptionKeyHex)

  const recipientEncryptionKeyHex =
    await aptos.confidentialCoin.getEncryptionByAddr({
      accountAddress: AccountAddress.from(recipientAddressHex),
      tokenAddress,
    })

  const transferTx = await aptos.confidentialCoin.transferCoin({
    senderDecryptionKey: decryptionKey,
    recipientEncryptionKey: new TwistedEd25519PublicKey(
      recipientEncryptionKeyHex,
    ),
    encryptedActualBalance: encryptedActualBalance,
    amountToTransfer,
    sender: account.accountAddress,
    tokenAddress,
    recipientAddress: recipientAddressHex,
    auditorEncryptionKeys: auditorsEncryptionKeyHexList.map(
      hex => new TwistedEd25519PublicKey(hex),
    ),
  })

  return await sendAndWaitTx(transferTx, account)
}

export const safelyRotateConfidentialBalance = async (
  account: Account,
  decryptionKeyHex: string,
  currEncryptedBalance: TwistedElGamalCiphertext[],
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const newDecryptionKey = TwistedEd25519PrivateKey.generate()

  return ConfidentialCoin.safeRotateCBKey(aptos, account, {
    sender: account.accountAddress,

    currDecryptionKey: new TwistedEd25519PrivateKey(decryptionKeyHex),
    newDecryptionKey: newDecryptionKey,

    currEncryptedBalance: currEncryptedBalance,

    withUnfreezeBalance: true,
    tokenAddress,
  })
}

export const safelyRolloverConfidentialBalance = async (
  account: Account,
  decryptionKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const rolloverTxPayloads = await aptos.confidentialCoin.safeRolloverPendingCB(
    {
      sender: account.accountAddress,
      tokenAddress,
      withFreezeBalance: false,
      decryptionKey: new TwistedEd25519PrivateKey(decryptionKeyHex),
    },
  )

  return sendAndWaitBatchTxs(rolloverTxPayloads, account)
}

export const registerConfidentialBalance = async (
  account: Account,
  publicKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const registerVBTxBody = await aptos.confidentialCoin.registerBalance({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    publicKey: new TwistedEd25519PublicKey(publicKeyHex),
  })

  return sendAndWaitTx(registerVBTxBody, account)
}

export const normalizeConfidentialBalance = async (
  account: Account,
  decryptionKeyHex: string,
  encryptedPendingBalance: TwistedElGamalCiphertext[],
  amount: bigint,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const normalizeTx = await aptos.confidentialCoin.normalizeUserBalance({
    tokenAddress,
    decryptionKey: new TwistedEd25519PrivateKey(decryptionKeyHex),
    unnormalizedEncryptedBalance: encryptedPendingBalance,
    balanceAmount: amount,

    sender: account.accountAddress,
  })

  return sendAndWaitTx(normalizeTx, account)
}

export const depositConfidentialBalance = async (
  account: Account,
  amount: bigint,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const depositTx = await aptos.confidentialCoin.deposit({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    amount: amount,
  })
  return sendAndWaitTx(depositTx, account)
}

export const depositConfidentialBalanceCoin = async (
  account: Account,
  amount: bigint,
  coinType: MoveStructId,
  to?: string,
) => {
  const depositTx = await aptos.confidentialCoin.depositCoin({
    sender: account.accountAddress,
    coinType: coinType,
    amount: amount,
    to: to ? AccountAddress.from(to) : account.accountAddress,
  })
  return sendAndWaitTx(depositTx, account)
}

export const getIsAccountRegisteredWithToken = async (
  account: Account,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const isRegistered = await aptos.confidentialCoin.hasUserRegistered({
    accountAddress: account.accountAddress,
    tokenAddress: tokenAddress,
  })

  return isRegistered
}

export const getIsBalanceNormalized = async (
  account: Account,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const isNormalized = await aptos.confidentialCoin.isUserBalanceNormalized({
    accountAddress: account.accountAddress,
    tokenAddress: tokenAddress,
  })

  return isNormalized
}

export const getIsBalanceFrozen = async (
  account: Account,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const isFrozen = await aptos.confidentialCoin.isBalanceFrozen({
    accountAddress: account.accountAddress,
    tokenAddress,
  })

  return isFrozen
}

export const getCoinByFaAddress = async (
  tokenAddress: string,
): Promise<{
  account_address: string
  module_name: string
  struct_name: string
}> => {
  const pairedCoinTypeStruct = (
    await aptos.view({
      payload: {
        function: '0x1::coin::paired_coin',
        functionArguments: [tokenAddress],
      },
    })
  ).at(0) as { vec: MoveValue[] }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return pairedCoinTypeStruct.vec[0]
}

export const parseCoinTypeFromCoinStruct = (coinStruct: {
  account_address: string
  module_name: string
  struct_name: string
}): MoveStructId => {
  const moduleNameUtf8 = ethers.toUtf8String(coinStruct.module_name)
  const structNameUtf8 = ethers.toUtf8String(coinStruct.struct_name)

  return `${coinStruct.account_address}::${moduleNameUtf8}::${structNameUtf8}`
}

export const getFAByCoinType = async (coinType: string): Promise<string> => {
  const fungibleAsset = (
    await aptos.view({
      payload: {
        function: '0x1::coin::paired_metadata',
        typeArguments: [coinType],
      },
    })
  ).at(0) as { vec: { inner: string }[] }

  return fungibleAsset?.vec[0].inner
}

export const getCoinBalanceByFaAddress = (
  account: Account,
  tokenAddress: string,
) => {
  return aptos.account.getAccountCoinAmount({
    accountAddress: account.accountAddress,
    faMetadataAddress: tokenAddress,
  })
}

export const getAptBalance = async (account: Account) => {
  const aptBalance = await aptos.getAccountAPTAmount({
    accountAddress: account.accountAddress,
  })

  return aptBalance
}

export const getConfidentialBalances = async (
  account: Account,
  decryptionKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN_ADRESSES[0],
) => {
  const decryptionKey = new TwistedEd25519PrivateKey(decryptionKeyHex)

  const { pending, actual } = await aptos.confidentialCoin.getBalance({
    accountAddress: account.accountAddress,
    tokenAddress,
  })

  try {
    const [confidentialAmountPending, confidentialAmountActual] =
      await Promise.all([
        ConfidentialAmount.fromEncrypted(pending, decryptionKey, {
          chunksCount: 4,
        }),
        ConfidentialAmount.fromEncrypted(actual, decryptionKey),
      ])

    return {
      pending: confidentialAmountPending,
      actual: confidentialAmountActual,
    }
  } catch (error) {
    return {
      pending: ConfidentialAmount.fromAmount(0n),
      actual: ConfidentialAmount.fromAmount(0n),
    }
  }
}

export const generatePrivateKeyHex = () => {
  const account = Account.generate()

  return account.privateKey.toString()
}

export const getFungibleAssetMetadata = async (
  tokenNameOrSymbolOrAddressHex: string,
): Promise<TokenBaseInfo[]> => {
  const isHex = isHexString(tokenNameOrSymbolOrAddressHex)

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
    : undefined

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
      })

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
      })

  const searchResults = await Promise.all([
    searchByHexPromise,
    searchByNamePromise,
    searchBySymbolPromise,
  ])

  const filteredUniqueFungibleAssets = searchResults
    .flat()
    .reduce((acc, el) => {
      if (!acc.find(accEl => accEl.asset_type === el?.asset_type) && el) {
        acc.push(el)
      }

      return acc
    }, [] as GetFungibleAssetMetadataResponse)

  return filteredUniqueFungibleAssets.map(el => ({
    address: el.asset_type,
    name: el.name,
    symbol: el.symbol,
    decimals: el.decimals,
    iconUri: el.icon_uri || '',
  }))
}

export const getFABalance = async (
  account: Account,
  tokenAddressHex: string,
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
  })
}

export const sendApt = async (
  account: Account,
  receiverAccountAddressHex: string,
  humanAmount: string,
) => {
  const amount = BN.fromRaw(humanAmount, 8).value

  const sendAptTransaction = await aptos.coin.transferCoinTransaction({
    sender: account.accountAddress,
    recipient: receiverAccountAddressHex,
    amount: BigInt(amount), // Ensure the amount is in bigint format
  })

  return sendAndWaitTx(sendAptTransaction, account)
}

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
}

export const validateEphemeralKeyPair = (
  keyPair: EphemeralKeyPair,
): EphemeralKeyPair | undefined =>
  isValidEphemeralKeyPair(keyPair) ? keyPair : undefined

export const isValidEphemeralKeyPair = (keyPair: EphemeralKeyPair): boolean => {
  if (keyPair.isExpired()) return false
  return true
}

/**
 * Create a new ephemeral key pair with a random private key and nonce.
 *
 * @param params Additional parameters for the ephemeral key pair
 */
export const createEphemeralKeyPair = ({
  expiryDateSecs = Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  privateKey = Ed25519PrivateKey.generate(),
  ...options
}: Partial<ConstructorParameters<typeof EphemeralKeyPair>[0]> = {}) =>
  new EphemeralKeyPair({ expiryDateSecs, privateKey, ...options })

export const idTokenSchema = z.object({
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string(),
  sub: z.string(),
})

export const nonceEncryptedIdTokenSchema = idTokenSchema.extend({
  nonce: z.string(),
})

export const profileScopedPayloadSchema = nonceEncryptedIdTokenSchema.extend({
  family_name: z.string().optional(),
  given_name: z.string().optional(),
  locale: z.string().optional(),
  name: z.string(),
  picture: z.string().optional(),
})

export const emailScopedPayloadSchema = nonceEncryptedIdTokenSchema.extend({
  email: z.string().optional(),
  email_verified: z.boolean(),
})

export const scopedPayloadSchema = profileScopedPayloadSchema.merge(
  emailScopedPayloadSchema,
)

export type IDToken = z.infer<typeof idTokenSchema>

export type NonceEncryptedIdToken = z.infer<typeof nonceEncryptedIdTokenSchema>

export type ProfileScopedPayloadSchema = z.infer<
  typeof profileScopedPayloadSchema
>

export type EmailScopedPayloadSchema = z.infer<typeof emailScopedPayloadSchema>

export type EncryptedScopedIdToken = z.infer<typeof scopedPayloadSchema>

export const decodeIdToken = (jwt: string): EncryptedScopedIdToken =>
  scopedPayloadSchema.parse(jwtDecode(jwt))

export const isValidIdToken = (
  jwt: string | EncryptedScopedIdToken,
): boolean => {
  if (typeof jwt === 'string') return isValidIdToken(decodeIdToken(jwt))

  // Check whether the token has an expiration, nonce, and is not expired
  if (!jwt.nonce) return false

  return true
}

export const validateIdToken = (
  jwt: string | EncryptedScopedIdToken,
): EncryptedScopedIdToken | null => {
  if (typeof jwt === 'string') return validateIdToken(decodeIdToken(jwt))
  return isValidIdToken(jwt) ? jwt : null
}

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
}

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
    : undefined
}
