import {
  ChunkedAmount,
  EncryptedAmount,
  TwistedEd25519PrivateKey,
  TwistedElGamalCiphertext,
} from '@aptos-labs/confidential-assets';
import { getBytes } from 'ethers';

import { preloadTables } from '../api/modules/aptos/wasmPollardKangaroo';

export type DecryptionWorkerRequest = {
  id: string;
  amountCiphertext: string;
  /** This should come from TwistedEd25519PrivateKey.toString(). */
  decryptionKeyBytesString: string;
};

export type DecryptionWorkerResponse = {
  id: string;
  amount?: number;
  error?: string;
};

/** Handle messages from the main thread asking for amount decryption. */
self.onmessage = async (event: MessageEvent<DecryptionWorkerRequest>) => {
  const { id, amountCiphertext, decryptionKeyBytesString } = event.data;

  try {
    // We have to call this in each thread.
    await preloadTables();

    // Reconstruct the decryption key from bytes.
    const decryptionKey = new TwistedEd25519PrivateKey(
      getBytes(decryptionKeyBytesString),
    );

    // Decrypt the amount.
    const serializedEncryptedAmountBytes = getBytes(amountCiphertext);
    const chunkedBytes: Uint8Array[] = [];
    const chunkSize = Math.ceil(
      serializedEncryptedAmountBytes.length / (ChunkedAmount.CHUNKS_COUNT / 2),
    );

    for (let i = 0; i < serializedEncryptedAmountBytes.length; i += chunkSize) {
      chunkedBytes.push(serializedEncryptedAmountBytes.slice(i, i + chunkSize));
    }

    // Create encrypted amount from the serialized bytes.
    const encrypted = chunkedBytes.map(el => {
      const C = el.slice(0, el.length / 2);
      const D = el.slice(el.length / 2);
      return new TwistedElGamalCiphertext(C, D);
    });

    const confidentialAmount = await EncryptedAmount.fromCipherTextAndPrivateKey(
      encrypted,
      decryptionKey,
    );

    // Send the decrypted amount back to the main thread.
    const response: DecryptionWorkerResponse = {
      id,
      amount: Number(confidentialAmount.getAmount()),
    };
    self.postMessage(response);
  } catch (error) {
    // Send error back to main thread.
    const response: DecryptionWorkerResponse = {
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    self.postMessage(response);
  }
};

// Export empty type for TypeScript.
export type {};
