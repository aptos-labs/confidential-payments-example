import { TwistedEd25519PrivateKey } from '@aptos-labs/confidential-assets';
import { LRUCache } from 'lru-cache';
import { useEffect, useState } from 'react';

import {
  DecryptionWorkerRequest,
  DecryptionWorkerResponse,
} from '@/workers/decryption.worker';

// Create a singleton LRU cache for decrypted amounts.
const decryptionCache = new LRUCache<string, number>({
  max: 100,
});

// Number of workers to use for parallel processing.
const NUM_WORKERS = 4;

// Create a pool of web workers.
let workerPool: Worker[] = [];
const workerPromises = new Map<
  string,
  { resolve: (value: number) => void; reject: (error: Error) => void }
>();
let workerCounter = 0;
let nextWorkerIndex = 0;

// Initialize the web worker pool.
function getNextWorker(): Worker {
  // Initialize workers if not already done.
  if (workerPool.length === 0) {
    for (let i = 0; i < NUM_WORKERS; i++) {
      const worker = new Worker(
        new URL('../workers/decryption.worker.ts', import.meta.url),
        {
          type: 'module',
        },
      );

      // Set up message handler.
      worker.onmessage = (event: MessageEvent<DecryptionWorkerResponse>) => {
        const { id, amount, error } = event.data;
        const promise = workerPromises.get(id);
        if (!promise) return;

        if (amount) {
          promise.resolve(amount);
        } else {
          promise.reject(new Error(error));
        }
        workerPromises.delete(id);
      };

      // Handle worker errors.
      worker.onerror = error => {
        // Reject all pending promises for this worker.
        for (const [id, promise] of workerPromises.entries()) {
          promise.reject(new Error('Worker error occurred: ' + error.message));
          workerPromises.delete(id);
        }

        // Replace the failed worker with a new one.
        const index = workerPool.indexOf(worker);
        if (index !== -1) {
          worker.terminate();
          workerPool[index] = new Worker(
            new URL('../workers/decryption.worker.ts', import.meta.url),
            {
              type: 'module',
            },
          );
        }
      };

      workerPool.push(worker);
    }
  }

  // Get next worker using round-robin.
  const worker = workerPool[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % NUM_WORKERS;
  return worker;
}

/**
 * Decrypts an encrypted amount ciphertext using the web worker pool.
 */
async function decryptAmount(
  amountCiphertext: string,
  decryptionKey: TwistedEd25519PrivateKey,
): Promise<number> {
  const worker = getNextWorker();
  const id = (++workerCounter).toString();

  return new Promise<number>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      workerPromises.delete(id);
      reject(new Error('Decryption timed out after 10 seconds'));
    }, 10000);

    workerPromises.set(id, {
      resolve: value => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      reject: error => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    const message: DecryptionWorkerRequest = {
      id,
      amountCiphertext,
      decryptionKeyBytesString: decryptionKey.toString(),
    };
    worker.postMessage(message);
  });
}

/**
 * Hook to handle asynchronous decryption of confidential amounts with caching.
 * Uses a web worker to avoid blocking the main thread during heavy computation.
 */
export function useDecryptedAmount(
  amountCiphertext: string,
  decryptionKey: TwistedEd25519PrivateKey,
) {
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Create a cache key combining ciphertext and key to ensure uniqueness.
    const cacheKey = `${amountCiphertext}_${decryptionKey.publicKey().toStringWithoutPrefix()}`;

    // Check if we already have this value in cache.
    const cachedAmount = decryptionCache.get(cacheKey);
    if (cachedAmount !== undefined) {
      setAmount(cachedAmount);
      setIsLoading(false);
      return;
    }

    setError(null);

    const startTime = Date.now();
    decryptAmount(amountCiphertext, decryptionKey)
      .then(decryptedAmount => {
        // Store result in cache.
        decryptionCache.set(cacheKey, decryptedAmount);
        setAmount(decryptedAmount);
        /*
        console.log(
          `[DecryptionWorker] Decryption of amount succeeded after ${Date.now() - startTime}ms`,
        );
        */
      })
      .catch(err => {
        const error =
          err instanceof Error ? err : new Error('Failed to decrypt amount');
        setError(error);
        console.error(
          `[DecryptionWorker] Decryption of amount failed after ${Date.now() - startTime}ms`,
        );
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Cleanup function to handle component unmount.
    return () => {
      // Terminate all workers if there are no more promises pending.
      if (workerPool.length > 0 && workerPromises.size === 0) {
        for (const worker of workerPool) {
          worker.terminate();
        }
        workerPool = [];
        nextWorkerIndex = 0;
      }
    };
  }, [amountCiphertext, decryptionKey]);

  return { amount, isLoading, error };
}
