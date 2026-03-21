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

  it("accepts valid proof (distance within range)", async () => {
    const input = await generateValidInput(10, 30, 3);
    const { proof, publicSignals } = await generateProof(input);
    const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
    expect(valid).to.be.true;
  });

  it("rejects proof with distance above threshold", async () => {
    const input = await generateInvalidInput(200, 30, 3);
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("rejects proof with distance below minimum (perfect replay)", async () => {
    // Distance 1 is below min_distance 3 — should fail
    const input = await generateValidInput(1, 30, 3);
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed — distance below minimum");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("rejects proof with zero distance (exact replay)", async () => {
    // Distance 0 — identical fingerprints — should fail
    const input = await generateValidInput(0, 30, 3);
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed — zero distance");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("accepts proof at exact min_distance boundary", async () => {
    // Distance exactly equals min_distance (>= should pass)
    const input = await generateValidInput(3, 30, 3);
    const { proof, publicSignals } = await generateProof(input);
    const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
    expect(valid).to.be.true;
  });

  it("rejects proof with wrong commitment", async () => {
    const input = await generateValidInput(10, 30, 3);
    input.commitment_new = "12345";
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("rejects proof with wrong salt", async () => {
    const input = await generateValidInput(10, 30, 3);
    input.salt_new = "99999";
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("rejects proof at exact threshold boundary", async () => {
    const input = await generateValidInput(30, 30, 3);
    try {
      await generateProof(input);
      expect.fail("Proof generation should have failed");
    } catch (err: any) {
      expect(err).to.exist;
    }
  });

  it("accepts proof one below threshold", async () => {
    const input = await generateValidInput(29, 30, 3);
    const { proof, publicSignals } = await generateProof(input);
    const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
    expect(valid).to.be.true;
  });

  it("serializes proof in groth16-solana format", async () => {
    const input = await generateValidInput(10, 30, 3);
    const { proof, publicSignals } = await generateProof(input);
    const { proofA, proofB, proofC } = serializeProofForSolana(proof);

    expect(proofA.length).to.equal(64);
    expect(proofB.length).to.equal(128);
    expect(proofC.length).to.equal(64);

    // 4 public inputs, each 32 bytes
    expect(publicSignals.length).to.equal(4);
  });
});
