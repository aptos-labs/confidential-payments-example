import {
  EncryptedAmount,
  TwistedEd25519PrivateKey,
  TwistedElGamalCiphertext,
} from '@aptos-labs/confidential-asset';
import { getBytes } from 'ethers';

export type DecryptionWorkerRequest = {
  id: string;
  /** C components of the ciphertext chunks (CompressedRistrettoPoint.data hex strings). */
  amountP: string[];
  /** D components of the ciphertext chunks for this user (CompressedRistrettoPoint.data hex strings). */
  amountR: string[];
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
  const { id, amountP, amountR, decryptionKeyBytesString } = event.data;

  try {
    // Reconstruct the decryption key from bytes.
    const decryptionKey = new TwistedEd25519PrivateKey(
      getBytes(decryptionKeyBytesString),
    );

    // Build TwistedElGamalCiphertext from the structured C and D components.
    const encrypted = amountP.map((pHex, i) => {
      return new TwistedElGamalCiphertext(pHex, amountR[i]);
    });

    const confidentialAmount = await EncryptedAmount.fromCipherTextAndPrivateKey(
      encrypted,
      decryptionKey,
    );

    const response: DecryptionWorkerResponse = {
      id,
      amount: Number(confidentialAmount.getAmount()),
    };
    self.postMessage(response);
  } catch (error) {
    const response: DecryptionWorkerResponse = {
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    self.postMessage(response);
  }
};

// Export empty type for TypeScript.
export type {};
