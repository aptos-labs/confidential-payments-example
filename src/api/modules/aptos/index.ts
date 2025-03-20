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
  type InputGenerateTransactionPayloadData,
  KeylessAccount,
  Network,
  NetworkToNetworkName,
  RangeProofExecutor,
  TransactionWorkerEventsEnum,
  TwistedEd25519PrivateKey,
  TwistedEd25519PublicKey,
  type TwistedElGamalCiphertext,
} from '@lukachi/aptos-labs-ts-sdk'
import { ethers } from 'ethers'
import { jwtDecode } from 'jwt-decode'
import { z } from 'zod'

import { apiClient } from '@/api/client'
import {
  genBatchRangeZKP,
  generateRangeZKP,
  verifyBatchRangeZKP,
  verifyRangeZKP,
} from '@/api/modules/aptos/wasmRangeProof'
import { config as appConfig } from '@/config'
import { sleep } from '@/helpers'
import { type TokenBaseInfo } from '@/store/wallet'

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
    privateKey: new Ed25519PrivateKey(sanitizedPrivateKeyHex),
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
  return new TwistedEd25519PrivateKey(ethers.zeroPadBytes(pepper, 32))
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
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
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
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
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
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
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
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
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
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
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
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
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
  amount: number,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const depositTx = await aptos.confidentialCoin.deposit({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    amount: amount,
  })
  return sendAndWaitTx(depositTx, account)
}

export const getIsAccountRegisteredWithToken = async (
  account: Account,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const isRegistered = await aptos.confidentialCoin.hasUserRegistered({
    accountAddress: account.accountAddress,
    tokenAddress: tokenAddress,
  })

  return isRegistered
}

export const getIsBalanceNormalized = async (
  account: Account,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const isNormalized = await aptos.confidentialCoin.isUserBalanceNormalized({
    accountAddress: account.accountAddress,
    tokenAddress: tokenAddress,
  })

  return isNormalized
}

export const getIsBalanceFrozen = async (
  account: Account,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const isFrozen = await aptos.confidentialCoin.isBalanceFrozen({
    accountAddress: account.accountAddress,
    tokenAddress,
  })

  return isFrozen
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
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
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

// TODO: mb implement aptos pepper register here
export const authorize = async () => {
  await sleep(1_000)
}

export const refresh = async () => {
  return apiClient.get<{
    access_token: string
    refresh_token: string
  }>('/integrations/decentralized-auth-svc/v1/refresh')
}

export const getFungibleAssetMetadata = async (
  tokenAddressHex: string,
): Promise<TokenBaseInfo> => {
  const fungibleAsset = await aptos.getFungibleAssetMetadataByAssetType({
    assetType: '0x123::test_coin::TestCoin',
  })

  return {
    address: tokenAddressHex,
    name: fungibleAsset.name,
    symbol: fungibleAsset.symbol,
    decimals: fungibleAsset.decimals,
    iconUri: fungibleAsset.icon_uri || '',
  }
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
): KeylessAccount | undefined =>
  // Check the Ephemeral key pair expiration
  isValidEphemeralKeyPair(account.ephemeralKeyPair) &&
  // Check the idToken for nonce
  isValidIdToken(account.jwt) &&
  // If the EphemeralAccount nonce algorithm changes, this will need to be updated
  decodeIdToken(account.jwt).nonce === account.ephemeralKeyPair.nonce
    ? account
    : undefined
