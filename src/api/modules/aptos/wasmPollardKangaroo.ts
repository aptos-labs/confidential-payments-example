// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import initWasm, {
  create_kangaroo,
  WASMKangaroo,
} from '@aptos-labs/confidential-asset-wasm-bindings/pollard-kangaroo';
import {
  ConfidentialAmount,
  TwistedEd25519PrivateKey,
  TwistedElGamal,
  TwistedElGamalCiphertext,
} from '@aptos-labs/confidential-assets';
import { bytesToNumberLE } from '@noble/curves/abstract/utils';

const POLLARD_KANGAROO_WASM_URL =
  'https://unpkg.com/@aptos-labs/confidential-asset-wasm-bindings@0.0.2/pollard-kangaroo/aptos_pollard_kangaroo_wasm_bg.wasm';

export async function createKangaroo(secret_size: number) {
  await initWasm({ module_or_path: POLLARD_KANGAROO_WASM_URL });
  return create_kangaroo(secret_size);
}

export const preloadTables = async () => {
  const kangaroo16 = await createKangaroo(16);
  const kangaroo32 = await createKangaroo(32);

  const decryptChunk = (
    pk: Uint8Array,
    instance: WASMKangaroo,
    timeoutMillis: bigint,
  ) => {
    if (bytesToNumberLE(pk) === 0n) return 0n;

    const result = instance.solve_dlp(pk, timeoutMillis);

    if (!result) throw new TypeError('Decryption failed');

    return result;
  };

  ConfidentialAmount.setDecryptBalanceFn(
    async (
      encrypted: TwistedElGamalCiphertext[],
      privateKey: TwistedEd25519PrivateKey,
    ) => {
      const mGs = encrypted.map(el =>
        TwistedElGamal.calculateCiphertextMG(el, privateKey),
      );

      const olderChunks = mGs.slice(0, encrypted.length / 2).map(el => el.toRawBytes());
      const yongerChunks = mGs
        .slice(-(encrypted.length / 2))
        .map(el => el.toRawBytes());

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Decryption timed out after 5 seconds'));
        }, 5000);

        Promise.all([
          ...olderChunks.map(el => decryptChunk(el, kangaroo16, 1500n)),
          ...yongerChunks.map(el => decryptChunk(el, kangaroo32, 3500n)),
        ])
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(err => {
            clearTimeout(timeout);
            reject(err);
          });
      });
    },
  );
};
