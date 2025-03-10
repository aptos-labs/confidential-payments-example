import { BN } from '@distributedlab/tools'
import {
  Account,
  type AnyRawTransaction,
  Aptos,
  AptosConfig,
  type CommittedTransactionResponse,
  ConfidentialAmount,
  ConfidentialCoin,
  Ed25519PrivateKey,
  type InputGenerateTransactionPayloadData,
  Network,
  NetworkToNetworkName,
  RangeProofExecutor,
  TransactionWorkerEventsEnum,
  TwistedEd25519PrivateKey,
  TwistedEd25519PublicKey,
  type TwistedElGamalCiphertext,
} from '@lukachi/aptos-labs-ts-sdk'

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

export const decryptionKeyFromPrivateKey = (privateKeyHex: string) => {
  const account = accountFromPrivateKey(privateKeyHex)

  const signature = account.sign(
    TwistedEd25519PrivateKey.decryptionKeyDerivationMessage,
  )

  return TwistedEd25519PrivateKey.fromSignature(signature)
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

export const mintTokens = async (
  privateKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)

  const tx = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: `${ConfidentialCoin.CONFIDENTIAL_COIN_MODULE_ADDRESS}::mock_token::mint_to`,
      functionArguments: [tokenAddress],
    },
  })

  return sendAndWaitTx(tx, account)
}

export const withdrawConfidentialBalance = async (
  privateKeyHex: string,
  decryptionKeyHex: string,
  withdrawAmount: bigint,
  encryptedActualBalance: TwistedElGamalCiphertext[],
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)
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
  privateKeyHex: string,
  decryptionKeyHex: string,
  encryptedActualBalance: TwistedElGamalCiphertext[],
  amountToTransfer: bigint,
  recipientEncryptionKeyHex: string,
  auditorsEncryptionKeyHexList: string[],
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)
  const decryptionKey = new TwistedEd25519PrivateKey(decryptionKeyHex)

  const transferTx = await aptos.confidentialCoin.transferCoin({
    senderDecryptionKey: decryptionKey,
    recipientEncryptionKey: new TwistedEd25519PublicKey(
      recipientEncryptionKeyHex,
    ),
    encryptedActualBalance: encryptedActualBalance,
    amountToTransfer,
    sender: account.accountAddress,
    tokenAddress,
    recipientAddress: account.accountAddress,
    auditorEncryptionKeys: auditorsEncryptionKeyHexList.map(
      hex => new TwistedEd25519PublicKey(hex),
    ),
  })

  return await sendAndWaitTx(transferTx, account)
}

export const safelyRotateConfidentialBalance = async (
  privateKeyHex: string,
  decryptionKeyHex: string,
  currEncryptedBalance: TwistedElGamalCiphertext[],
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const newDecryptionKey = TwistedEd25519PrivateKey.generate()

  const account = accountFromPrivateKey(privateKeyHex)

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
  privateKeyHex: string,
  decryptionKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)

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
  privateKeyHex: string,
  publicKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)

  const registerVBTxBody = await aptos.confidentialCoin.registerBalance({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    publicKey: new TwistedEd25519PublicKey(publicKeyHex),
  })

  return sendAndWaitTx(registerVBTxBody, account)
}

export const normalizeConfidentialBalance = async (
  privateKey: string,
  decryptionKeyHex: string,
  encryptedPendingBalance: TwistedElGamalCiphertext[],
  amount: bigint,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKey)

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
  privateKey: string,
  amount: number,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKey)

  const depositTx = await aptos.confidentialCoin.deposit({
    sender: account.accountAddress,
    tokenAddress: tokenAddress,
    amount: amount,
  })
  return sendAndWaitTx(depositTx, account)
}

export const getIsAccountRegisteredWithToken = async (
  privateKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)

  const isRegistered = await aptos.confidentialCoin.hasUserRegistered({
    accountAddress: account.accountAddress,
    tokenAddress: tokenAddress,
  })

  return isRegistered
}

export const getIsBalanceNormalized = async (
  privateKey: string,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKey)

  const isNormalized = await aptos.confidentialCoin.isUserBalanceNormalized({
    accountAddress: account.accountAddress,
    tokenAddress: tokenAddress,
  })

  return isNormalized
}

export const getIsBalanceFrozen = async (
  privateKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)

  const isFrozen = await aptos.confidentialCoin.isBalanceFrozen({
    accountAddress: account.accountAddress,
    tokenAddress,
  })

  return isFrozen
}

export const getAptBalance = async (privateKeyHex: string) => {
  const account = accountFromPrivateKey(privateKeyHex)

  const aptBalance = await aptos.getAccountAPTAmount({
    accountAddress: account.accountAddress,
  })

  return aptBalance
}

export const getConfidentialBalances = async (
  privateKeyHex: string,
  decryptionKeyHex: string,
  tokenAddress = appConfig.DEFAULT_TOKEN.address,
) => {
  const account = accountFromPrivateKey(privateKeyHex)
  const decryptionKey = new TwistedEd25519PrivateKey(decryptionKeyHex)

  const { pending, actual } = await aptos.confidentialCoin.getBalance({
    accountAddress: account.accountAddress,
    tokenAddress,
  })

  try {
    const [confidentialAmountPending, confidentialAmountActual] =
      await Promise.all([
        ConfidentialAmount.fromEncrypted(pending, decryptionKey),
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
  privateKeyHex: string,
  receiverAccountAddressHex: string,
  humanAmount: string,
) => {
  const amount = BN.fromRaw(humanAmount, 8).value

  const account = accountFromPrivateKey(privateKeyHex)

  const sendAptTransaction = await aptos.coin.transferCoinTransaction({
    sender: account.accountAddress,
    recipient: receiverAccountAddressHex,
    amount: BigInt(amount), // Ensure the amount is in bigint format
  })

  return sendAndWaitTx(sendAptTransaction, account)
}
