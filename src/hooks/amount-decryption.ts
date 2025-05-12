import {
  ConfidentialAmount,
  TwistedEd25519PrivateKey,
  TwistedElGamalCiphertext,
} from '@aptos-labs/confidential-assets';
import { getBytes } from 'ethers';
import { LRUCache } from 'lru-cache';
import { useEffect, useState } from 'react';

import { bus, BusEvents } from '@/helpers';

// Create a singleton LRU cache for decrypted amounts
// Cache key is ciphertext + decryption key hash, value is the decrypted amount
const decryptionCache = new LRUCache<string, number>({
  max: 100, // Maximum number of items to store in the cache
});

/**
 * Decrypts an encrypted amount ciphertext using the provided decryption key.
 * Handles processing the ciphertext into the format expected by the ConfidentialAmount API.
 */
async function decryptAmount(
  amountCiphertext: string,
  decryptionKey: TwistedEd25519PrivateKey,
): Promise<number> {
  const serializedEncryptedAmountBytes = getBytes(amountCiphertext);

  const chunkedBytes: Uint8Array[] = [];
  const chunkSize = Math.ceil(
    serializedEncryptedAmountBytes.length / (ConfidentialAmount.CHUNKS_COUNT / 2),
  );

  for (let i = 0; i < serializedEncryptedAmountBytes.length; i += chunkSize) {
    chunkedBytes.push(serializedEncryptedAmountBytes.slice(i, i + chunkSize));
  }

  // Create encrypted amount from the serialized bytes
  const encrypted = chunkedBytes.map(el => {
    const C = el.slice(0, el.length / 2);
    const D = el.slice(el.length / 2);
    return new TwistedElGamalCiphertext(C, D);
  });

  const confidentialAmount = await ConfidentialAmount.fromEncrypted(
    encrypted,
    decryptionKey,
  );

  return Number(confidentialAmount.amount);
}

/**
 * Hook to handle asynchronous decryption of confidential amounts with caching.
 * Uses an LRU cache to avoid redundant decryptions of the same ciphertext.
 */
export function useDecryptedAmount(
  amountCiphertext: string | undefined,
  decryptionKey: TwistedEd25519PrivateKey,
) {
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!amountCiphertext) {
      setAmount(undefined);
      return;
    }

    // For now just return undefined while we fix the issue with ConfidentialAmount.fromEncrypted.
    if (amountCiphertext) {
      return;
    }

    // Create a cache key combining ciphertext and key to ensure uniqueness
    const cacheKey = `${amountCiphertext}_${decryptionKey.toString()}`;

    // Check if we already have this value in cache
    const cachedAmount = decryptionCache.get(cacheKey);
    if (cachedAmount !== undefined) {
      setAmount(cachedAmount);
      return;
    }

    setIsLoading(true);
    setError(null);

    decryptAmount(amountCiphertext, decryptionKey)
      .then(decryptedAmount => {
        // Store result in cache
        decryptionCache.set(cacheKey, decryptedAmount);
        setAmount(decryptedAmount);
        setIsLoading(false);
      })
      .catch(err => {
        const error =
          err instanceof Error ? err : new Error('Failed to decrypt amount');
        setError(error);
        setIsLoading(false);
        // Surface the error with a toast via the bus
        bus.emit(BusEvents.Error, `Failed to decrypt amount: ${error.message}`);
      });
  }, [amountCiphertext, decryptionKey]);

  return { amount, isLoading, error };
}
