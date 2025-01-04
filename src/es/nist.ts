import {supply} from '@blake.regalia/belt';

/**
 * circular rotate left.
 *
 * @param xw 32-bit word
 * @param ni number of bits
 * @returns 
 */
export const rotl_32 = (xw: number, ni: number): number => (xw << ni) | (xw >>> (32 - ni));

/**
 * circular rotate right
 *
 * @param xw 32-bit word
 * @param ni number of bits
 * @returns
 */
export const rotr_32 = (xw: number, ni: number): number => (xw >>> ni) | (xw << (32 - ni));

/**
 * shift right
 *
 * @param xw 32-bit word
 * @param ni number of bits
 * @returns
 */
const shr_32 = (xw: number, ni: number): number => xw >>> ni;

/**
 * NIST parity
 *
 * @param xw_a 32-bit word
 * @param xw_b 32-bit word
 * @param xw_c 32-bit word
 * @returns
 */
export const parity_32 =(xw_a: number, xw_b: number, xw_c: number): number => xw_a ^ xw_b ^ xw_c;

/**
 * NIST ch
 *
 * @param xw_a 32-bit word
 * @param xw_b 32-bit word
 * @param xw_c 32-bit word
 * @returns
 */
export const ch_32 = (xw_a: number, xw_b: number, xw_c: number): number => (xw_a & xw_b) ^ (~xw_a & xw_c);

/**
 * NIST maj
 *
 * @param xw_a 32-bit word
 * @param xw_b 32-bit word
 * @param xw_c 32-bit word
 * @returns
 */
export const maj_32 = (xw_a: number, xw_b: number, xw_c: number): number => (xw_a & xw_b) ^ (xw_a & xw_c) ^ (xw_b & xw_c);

/**
 * NIST sigma0
 *
 * @param xw 32-bit value
 * @returns
 */
export const sigma0_32 = (xw: number): number => rotr_32(xw, 2) ^ rotr_32(xw, 13) ^ rotr_32(xw, 22);

/**
 * safe add two words
 *
 * @param xw_a 32-bit word
 * @param xw_b 32-bit word
 * @returns safe sum of all values
 */
export const u32_safe_add_2 = (xw_a: number, xw_b: number): number => supply(
	(xw_a & 0xffff) + (xw_b & 0xffff),
	xw_ls => (((xw_a >>> 16) + (xw_b >>> 16) + (xw_ls >>> 16) & 0xffff) << 16) | (xw_ls & 0xffff)
);

/**
 * NIST gamma0
 *
 * @param xw 32-bit value
 * @returns
 */
export const gamma0_32 = (xw: number): number => rotr_32(xw, 7) ^ rotr_32(xw, 18) ^ shr_32(xw, 3);

/**
 * NIST gamma1
 *
 * @param xw 32-bit value
 * @returns
 */
export const gamma1_32 = (xw: number): number => rotr_32(xw, 17) ^ rotr_32(xw, 19) ^ shr_32(xw, 10);

/**
 * NIST sigma1
 *
 * @param xw 32-bit value
 * @returns
 */
export const sigma1_32 = (xw: number): number => rotr_32(xw, 6) ^ rotr_32(xw, 11) ^ rotr_32(xw, 25);


/**
 * safe add four words
 *
 * @param xw_a 32-bit word
 * @param xw_b 32-bit word
 * @param xw_c 32-bit word
 * @param xw_d 32-bit word
 * @returns safe sum of all values
 */
export const u32_safe_add_4 = (xw_a: number, xw_b: number, xw_c: number, xw_d: number): number => supply(
	(xw_a & 0xffff) + (xw_b & 0xffff) + (xw_c & 0xffff) + (xw_d & 0xffff),
	xw_ls => (((xw_a >>> 16) + (xw_b >>> 16) + (xw_c >>> 16) + (xw_d >>> 16) + (xw_ls >>> 16) & 0xffff) << 16) | (xw_ls & 0xffff)
);

/**
 * safe add five words
 *
 * @param xw_a 32-bit word
 * @param xw_b 32-bit word
 * @param xw_c 32-bit word
 * @param xw_d 32-bit word
 * @param xw_e 32-bit word
 * @returns safe sum of all values
 */
export const u32_safe_add_5 = (xw_a: number, xw_b: number, xw_c: number, xw_d: number, xw_e: number): number => supply(
	(xw_a & 0xffff) + (xw_b & 0xffff) + (xw_c & 0xffff) + (xw_d & 0xffff) + (xw_e & 0xffff),
	xw_ls => (((xw_a >>> 16) + (xw_b >>> 16) + (xw_c >>> 16) + (xw_d >>> 16) + (xw_e >>> 16) + (xw_ls >>> 16) & 0xffff) << 16) | (xw_ls & 0xffff)
);
