// Generates a test proof fixture for protocol-core integration tests.
// Outputs: ../protocol-core/tests/fixtures/test_proof.json

import { generateValidInput, generateProof, serializeProofForSolana } from "../test/test_vectors";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Generating valid test proof...");
  const input = await generateValidInput(10, 30);
  const { proof, publicSignals } = await generateProof(input);
  const { proofA, proofB, proofC } = serializeProofForSolana(proof);

  // Combine into single 256-byte proof
  const proofBytes = Array.from(new Uint8Array([...proofA, ...proofB, ...proofC]));

  // Public signals from snarkjs are in order: commitment_new, commitment_prev, threshold
  // Convert to 32-byte big-endian arrays
  function toBigEndian32(decStr: string): number[] {
    let n = BigInt(decStr);
    const bytes: number[] = new Array(32).fill(0);
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(n & BigInt(0xff));
      n >>= BigInt(8);
    }
    return bytes;
  }

  const publicInputs = publicSignals.map((s: string) => toBigEndian32(s));

  const fixture = {
    description: "Valid Groth16 proof for Entros Hamming circuit (distance=10, threshold=30)",
    proof_bytes: proofBytes,
    public_inputs: publicInputs,
    public_signals_decimal: publicSignals,
  };

  const outDir = path.resolve(__dirname, "../../protocol-core/tests/fixtures");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "test_proof.json");
  fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2));
  console.log(`Written to ${outPath}`);
  console.log(`Proof size: ${proofBytes.length} bytes`);
  console.log(`Public inputs: ${publicInputs.length}`);
}

main().catch(console.error);
