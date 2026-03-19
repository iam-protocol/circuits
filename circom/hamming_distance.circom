pragma circom 2.1.0;

// Computes the Hamming distance between two n-bit arrays.
// Assumes inputs are already constrained to be binary (0 or 1).
// XOR per bit pair: a + b - 2*a*b (equals 1 if bits differ, 0 if same).
// Distance is the sum of all XOR results.

template HammingDistance(n) {
    signal input a[n];
    signal input b[n];
    signal output distance;

    signal xor[n];
    var sum = 0;

    for (var i = 0; i < n; i++) {
        xor[i] <== a[i] + b[i] - 2 * a[i] * b[i];
        sum += xor[i];
    }

    distance <== sum;
}
