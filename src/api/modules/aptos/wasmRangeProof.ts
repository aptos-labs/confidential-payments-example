// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import initWasm, {
  batch_range_proof as batchRangeProof,
  batch_verify_proof as batchVerifyProof,
} from '@aptos-labs/confidential-asset-wasm-bindings/range-proofs';
import {
  BatchRangeProofInputs,
  BatchVerifyRangeProofInputs,
} from '@aptos-labs/confidential-assets';

const RANGE_PROOF_WASM_URL =
  'https://unpkg.com/@aptos-labs/confidential-asset-wasm-bindings@0.0.2/range-proofs/aptos_rp_wasm_bg.wasm';

export async function genBatchRangeZKP(
  opts: BatchRangeProofInputs,
): Promise<{ proof: Uint8Array; commitments: Uint8Array[] }> {
  await initWasm({ module_or_path: RANGE_PROOF_WASM_URL });

  const proof = batchRangeProof(
    new BigUint64Array(opts.v),
    opts.rs,
    opts.val_base,
    opts.rand_base,
    opts.num_bits,
  );

  return {
    proof: proof.proof(),
    commitments: proof.comms(),
  };
}

export async function verifyBatchRangeZKP(
  opts: BatchVerifyRangeProofInputs,
): Promise<boolean> {
  await initWasm({ module_or_path: RANGE_PROOF_WASM_URL });

  return batchVerifyProof(
    opts.proof,
    opts.comm,
    opts.val_base,
    opts.rand_base,
    opts.num_bits,
  );
}
