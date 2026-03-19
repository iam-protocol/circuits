#!/usr/bin/env node

// Converts a snarkjs verification_key.json to Rust constants
// compatible with groth16-solana's Groth16Verifyingkey struct.
//
// Usage: node parse_vk_to_rust.js <vk_json_path> <output_dir>
//
// Adapted from github.com/Lightprotocol/groth16-solana

const fs = require("fs");
const path = require("path");

function toBigEndian32(decStr) {
  let n = BigInt(decStr);
  const bytes = [];
  for (let i = 0; i < 32; i++) {
    bytes.unshift(Number(n & BigInt(0xff)));
    n >>= BigInt(8);
  }
  return bytes;
}

function formatBytes(bytes) {
  return bytes.map((b) => b.toString()).join(", ");
}

function g1ToBytes(point) {
  const x = toBigEndian32(point[0]);
  const y = toBigEndian32(point[1]);
  return [...x, ...y];
}

// G2 points have reversed coordinate ordering (c1, c0)
function g2ToBytes(point) {
  const x_c1 = toBigEndian32(point[0][1]);
  const x_c0 = toBigEndian32(point[0][0]);
  const y_c1 = toBigEndian32(point[1][1]);
  const y_c0 = toBigEndian32(point[1][0]);
  return [...x_c1, ...x_c0, ...y_c1, ...y_c0];
}

// Negate a G1 point (for proof_a negation reference)
// BN254 prime for negation
const P = BigInt(
  "21888242871839275222246405745257275088696311157297823662689037894645226208583"
);

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node parse_vk_to_rust.js <vk_json> <output_dir>");
    process.exit(1);
  }

  const vk = JSON.parse(fs.readFileSync(args[0], "utf-8"));
  const outputDir = args[1];

  const nrPubInputs = vk.IC.length - 1;

  const alphaG1 = g1ToBytes(vk.vk_alpha_1);
  const betaG2 = g2ToBytes(vk.vk_beta_2);
  const gammaG2 = g2ToBytes(vk.vk_gamma_2);
  const deltaG2 = g2ToBytes(vk.vk_delta_2);

  const icEntries = vk.IC.map((ic) => g1ToBytes(ic));

  let rust = `// Auto-generated from verification_key.json
// Do not edit manually. Re-run: node scripts/parse_vk_to_rust.js

use groth16_solana::groth16::Groth16Verifyingkey;

pub const VERIFYINGKEY: Groth16Verifyingkey = Groth16Verifyingkey {
    nr_pubinputs: ${nrPubInputs},

    vk_alpha_g1: [
        ${formatBytes(alphaG1)}
    ],

    vk_beta_g2: [
        ${formatBytes(betaG2)}
    ],

    vk_gamme_g2: [
        ${formatBytes(gammaG2)}
    ],

    vk_delta_g2: [
        ${formatBytes(deltaG2)}
    ],

    vk_ic: &[
`;

  for (const ic of icEntries) {
    rust += `        [\n            ${formatBytes(ic)}\n        ],\n`;
  }

  rust += `    ],
};
`;

  const outputPath = path.join(outputDir, "verifying_key.rs");
  fs.writeFileSync(outputPath, rust);
  console.log(`Verification key written to ${outputPath}`);
  console.log(`Public inputs: ${nrPubInputs}`);
  console.log(`IC entries: ${icEntries.length}`);
}

main();
