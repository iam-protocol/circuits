pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

// Verifies that a Poseidon commitment matches a set of private bits and salt.
// Packs n_bits into two 128-bit field elements, then hashes with Poseidon(3).
// Constrains the hash output against the public commitment.
//
// Bit-ordering convention: Bits2Num is little-endian (bits[0] = 2^0). Off-circuit
// code packing fingerprint bits MUST use the same convention. See
// `test/test_vectors.ts:packBitsToFieldElements` for the matching JS packer.

template CommitmentCheck(n_bits) {
    signal input bits[n_bits];
    signal input salt;
    signal input commitment;

    // Pack bits[0..128] into field element 0 (little-endian)
    component pack_lo = Bits2Num(128);
    for (var i = 0; i < 128; i++) {
        pack_lo.in[i] <== bits[i];
    }

    // Pack bits[128..256] into field element 1 (little-endian)
    component pack_hi = Bits2Num(128);
    for (var i = 0; i < 128; i++) {
        pack_hi.in[i] <== bits[128 + i];
    }

    // Poseidon(fe_lo, fe_hi, salt) = commitment
    component hasher = Poseidon(3);
    hasher.inputs[0] <== pack_lo.out;
    hasher.inputs[1] <== pack_hi.out;
    hasher.inputs[2] <== salt;

    hasher.out === commitment;
}
