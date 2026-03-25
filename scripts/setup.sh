#!/usr/bin/env bash
# Full trusted setup: download ptau, compile circuit, run Phase 2, export VK.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== IAM Circuit Setup ==="

# 1. Check circom
if ! command -v circom &>/dev/null; then
  echo "Error: circom not installed. Run: cargo install --git https://github.com/iden3/circom.git"
  exit 1
fi

# 2. Download powers of tau if needed
if [ ! -f build/pot12_final.ptau ]; then
  echo "Downloading Hermez powers of tau..."
  mkdir -p build
  curl -L -o build/pot12_final.ptau \
    https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau
fi

# 3. Compile circuit
echo "Compiling circuit..."
circom circom/iam_hamming.circom \
  --r1cs --wasm --sym \
  --output build/ \
  -l node_modules/circomlib/circuits

echo "Constraint info:"
npx snarkjs r1cs info build/iam_hamming.r1cs

# 3b. Verify constraint count fits within ptau level (2^12 = 4096 for pot12)
PTAU_MAX=4096
CONSTRAINT_COUNT=$(npx snarkjs r1cs info build/iam_hamming.r1cs 2>&1 | grep -i "constraints" | grep -oE '[0-9]+' | head -1)
if [ -n "$CONSTRAINT_COUNT" ] && [ "$CONSTRAINT_COUNT" -gt "$PTAU_MAX" ]; then
  echo "Error: circuit has $CONSTRAINT_COUNT constraints but ptau supports max $PTAU_MAX (2^12)."
  echo "Use a larger ptau file (e.g., pot14_final.ptau for 2^14 = 16384)."
  exit 1
fi
echo "Constraint check: $CONSTRAINT_COUNT <= $PTAU_MAX (ptau level 12) ✓"

# 4. Phase 2 setup
echo "Running Groth16 Phase 2 setup..."
npx snarkjs groth16 setup build/iam_hamming.r1cs build/pot12_final.ptau build/iam_hamming_0000.zkey

echo "Contributing randomness..."
npx snarkjs zkey contribute build/iam_hamming_0000.zkey build/iam_hamming_final.zkey \
  --name="IAM Protocol" -e="iam-$(date +%s)-$(openssl rand -hex 8)"

# 5. Export verification key
echo "Exporting verification key..."
npx snarkjs zkey export verificationkey build/iam_hamming_final.zkey keys/verification_key.json

# 6. Export to Rust format
echo "Exporting Rust verification key..."
node scripts/parse_vk_to_rust.js keys/verification_key.json keys/

echo "=== Setup complete ==="
