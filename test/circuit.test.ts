import { expect } from "chai";
import * as snarkjs from "snarkjs";
import * as path from "path";
import * as fs from "fs";
import {
  generateValidInput,
  generateInvalidInput,
  generateProof,
  serializeProofForSolana,
  VK_PATH,
} from "./test_vectors";

describe("IAM Hamming Distance Circuit", function () {
  this.timeout(120000); // ZK proof generation can take time

  let vk: any;

  before(async () => {
    const vkPath = path.resolve(VK_PATH);
    vk = JSON.parse(fs.readFileSync(vkPath, "utf-8"));
  });

  it("accepts valid proof (distance below threshold)", async () => {
    const input = await generateValidInput(10, 30);
    const { proof, publicSignals } = await generateProof(input);
    const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
    expect(valid).to.be.true;
  });

  it("rejects proof with distance above threshold", async () => {
    const input = await generateInvalidInput(200, 30);
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      // Circuit constraint violation: LessThan fails when distance >= threshold
      expect(err).to.exist;
    }
  });

  it("rejects proof with wrong commitment", async () => {
    const input = await generateValidInput(10, 30);
    // Tamper with commitment
    input.commitment_new = "12345";
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      // Poseidon constraint violation
      expect(err).to.exist;
    }
  });

  it("rejects proof with wrong salt", async () => {
    const input = await generateValidInput(10, 30);
    // Tamper with salt
    input.salt_new = "99999";
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("rejects proof at exact threshold boundary", async () => {
    // Distance exactly equals threshold (strict less-than should fail)
    const input = await generateValidInput(30, 30);
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("accepts proof one below threshold", async () => {
    const input = await generateValidInput(29, 30);
    const { proof, publicSignals } = await generateProof(input);
    const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
    expect(valid).to.be.true;
  });

  it("serializes proof in groth16-solana format", async () => {
    const input = await generateValidInput(10, 30);
    const { proof } = await generateProof(input);
    const { proofA, proofB, proofC } = serializeProofForSolana(proof);

    expect(proofA.length).to.equal(64);
    expect(proofB.length).to.equal(128);
    expect(proofC.length).to.equal(64);

    // Total proof bytes = 256
    const totalProof = new Uint8Array(256);
    totalProof.set(proofA, 0);
    totalProof.set(proofB, 64);
    totalProof.set(proofC, 192);
    expect(totalProof.length).to.equal(256);
  });
});
