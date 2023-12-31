import {hex_to_bytes} from '@blake.regalia/belt';

// sha256("starshell")
export const ATU8_SHA256_STARSHELL = hex_to_bytes('7b8092917ded4a978346e0cb7ceaf60f5db57d48405e55919c6a0787ca8977ce');

// sha512("starshell")
export const ATU8_SHA512_STARSHELL = hex_to_bytes('34ba055f29242f0a71555ca843f9be91cbe46cb22c7bc825a9c171d1b40bd7f4244a24b7089004a4697ba900c98048d707d3c39f2f67564344ece4af6a3ba9f1');

// maximum value of an unsigned 64-bit integer
export const XG_UINT64_MAX = (2n ** 64n) - 1n;

