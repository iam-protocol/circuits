# circuits

ZK circuit definitions for the IAM Protocol. Proves that the Hamming distance between two Poseidon-committed Temporal Fingerprints is below a threshold, without revealing either fingerprint.

## Circuit

**`iam_hamming.circom`** — Main Groth16 circuit (BN254). ~1,996 constraints.

Proves three things:
1. `Poseidon(pack(ft_new), salt_new) == commitment_new`
2. `Poseidon(pack(ft_prev), salt_prev) == commitment_prev`
3. `HammingDistance(ft_new, ft_prev) < threshold`

Public inputs: `commitment_new`, `commitment_prev`, `threshold`
Private witnesses: `ft_new[256]`, `ft_prev[256]`, `salt_new`, `salt_prev`

## Setup

```bash
# Prerequisites: circom (cargo install --git https://github.com/iden3/circom.git), Node.js >= 20

npm install
./scripts/setup.sh    # Download ptau, compile, trusted setup, export VK
npm test              # Run circuit tests (7 tests)
```

## Proof Generation

```bash
# Generate a test proof (requires setup.sh to have been run)
npx snarkjs groth16 fullprove <input.json> build/iam_hamming_js/iam_hamming.wasm build/iam_hamming_final.zkey proof.json public.json
```

## Verification Key

`keys/verification_key.json` — snarkjs format, committed to the repo.
`keys/verifying_key.rs` — Rust format for `groth16-solana`, used by `protocol-core/iam-verifier`.

## License

MIT
