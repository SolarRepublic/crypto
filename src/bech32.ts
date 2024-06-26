
import type {NaiveBase64, Nilable} from '@blake.regalia/belt';

import type {CwAccountAddr} from '@solar-republic/types';

import {__UNDEFINED, base64_to_bytes, die} from '@blake.regalia/belt';

import {ripemd160_sync} from './wasm/ripemd160.js';
import {sha256_sync} from './wasm/sha256.js';

const SX_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';


export type PropagateUndefined<z_any> = z_any extends undefined? undefined: never;

const polymod_step = (xb_pre: number, xb_value=xb_pre >> 25): number => ((xb_pre & 0x1ffffff) << 5)
	^ (-((xb_value >> 0) & 1) & 0x3b6a57b2)
	^ (-((xb_value >> 1) & 1) & 0x26508e6d)
	^ (-((xb_value >> 2) & 1) & 0x1ea119fa)
	^ (-((xb_value >> 3) & 1) & 0x3d4233dd)
	^ (-((xb_value >> 4) & 1) & 0x2a1462b3);

const prefix_checksum = (s_prefix: string): number => {
	let xb_checksum = 1;
	for(const s_char of s_prefix) {
		xb_checksum = polymod_step(xb_checksum) ^ (s_char.charCodeAt(0) >> 5);
	}

	xb_checksum = polymod_step(xb_checksum);

	for(const s_char of s_prefix) {
		xb_checksum = polymod_step(xb_checksum) ^ (s_char.charCodeAt(0) & 0x1f);
	}

	return xb_checksum;
};

const regroup_bits = (a_words: Iterable<number>, ni_in: number, ni_out: number, xc_pad=0, xm_mask=(1 << ni_out) - 1): number[] => {
	const a_out: number[] = [];
	let xb_tmp = 0;
	let xi_carry = 0;

	for(const xb_word of a_words) {
		xb_tmp = (xb_tmp << ni_in) | xb_word;
		xi_carry += ni_in;

		while(xi_carry >= ni_out) {
			xi_carry -= ni_out;
			a_out.push((xb_tmp >> xi_carry) & xm_mask);
		}
	}

	if(xc_pad && xi_carry) a_out.push((xb_tmp << (ni_out - xi_carry)) & xm_mask);

	return a_out;
};


/**
 * Converts a public key into a bech32 address
 * @param z_pubkey - public key bytes as Uint8Array or base64-encoded string
 * @param si_hrp - the human readable part of the bech32 address
 * @returns bech32 address
 */
export const pubkey_to_bech32 = <
	si_hrp extends string,
>(z_pubkey: NaiveBase64 | Uint8Array, si_hrp: si_hrp): CwAccountAddr<si_hrp> => {
	const atu8_pk = 'string' === typeof z_pubkey? base64_to_bytes(z_pubkey): z_pubkey;
	if(!(atu8_pk instanceof Uint8Array)) {
		throw TypeError(`Pubkey argument must be a Uint8Array or base64-encoded string`);
	}

	// perform sha-256 hashing on the public key
	const atu8_sha256 = sha256_sync(atu8_pk);

	// perform ripemd-160 hashing on the result
	const atu8_ripemd160 = ripemd160_sync(atu8_sha256);

	// convert to bech32 string
	return bech32_encode(si_hrp, atu8_ripemd160);
};


// option A
// eslint-disable-next-line @typescript-eslint/naming-convention
/**
 * Encode an address in bech32 format
 * @param si_hrp - the human-readable part without the '1' separator
 * @param atu8_data - canonical addr data
 * @returns 
 */
export const bech32_encode = <
	si_hrp extends string,
>(si_hrp: si_hrp, atu8_data: Uint8Array): CwAccountAddr<si_hrp> => {
	let xb_checksum = prefix_checksum(si_hrp);

	let sa_output = si_hrp+'1';

	for(const x_word of regroup_bits(atu8_data, 8, 5, 1)) {
		xb_checksum = polymod_step(xb_checksum) ^ x_word;
		sa_output += SX_ALPHABET.charAt(x_word);
	}

	for(let i_checksum=0; i_checksum<6; i_checksum++) {
		xb_checksum = polymod_step(xb_checksum);
	}

	xb_checksum ^= 1;

	for(let i_checksum=0; i_checksum<6; i_checksum++) {
		const x_word = (xb_checksum >> ((5 - i_checksum) * 5)) & 0x1f;
		sa_output += SX_ALPHABET.charAt(x_word);
	}

	return sa_output as CwAccountAddr<si_hrp>;
};

// // option B
// export const bech32Encode = (si_prefix: string, atu8_data: Uint8Array): string => {
// 	let xb_checksum = prefix_checksum(si_prefix);

// 	// eslint-disable-next-line prefer-const
// 	let sa_output = regroup_bits(atu8_data, 8, 5, 1).reduce((s_out, xn_word) => (
// 		xb_checksum = polymod_step(xb_checksum) ^ xn_word,
// 		s_out + SX_ALPHABET.charAt(xn_word)
// 	), si_prefix+'1');

// 	// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
// 	Array(6).map(_ => xb_checksum = polymod_step(xb_checksum));

// 	xb_checksum ^= 1;

// 	return Array<never>(6).reduce((s_out, w, i_checksum) => s_out + SX_ALPHABET.charAt(
// 		(xb_checksum >> ((5 - i_checksum) * 5)) & 0x1f
// 	), sa_output);
// };

// eslint-disable-next-line @typescript-eslint/naming-convention
export const bech32_decode = <
	sa_defined extends string,
>(sa_bech32: Nilable<sa_defined>): Uint8Array | PropagateUndefined<sa_defined> => {
	if(!sa_bech32) return __UNDEFINED as PropagateUndefined<sa_defined>;

	const [s_prefix, sx_data] = sa_bech32.split('1');

	let xb_checksum = prefix_checksum(s_prefix);

	const a_words: number[] = [];

	for(const s_char of sx_data) {
		const x_word = SX_ALPHABET.indexOf(s_char);
		if(x_word < 0) die('Unknown character '+s_char);

		xb_checksum = polymod_step(xb_checksum) ^ x_word;

		// do not add checksum to word data
		if(a_words.length >= sx_data.length - 6) continue;

		// add numeric value to word data
		a_words.push(x_word);
	}

	if(1 !== xb_checksum) die('Invalid checksum for '+sa_bech32);

	return Uint8Array.from(regroup_bits(a_words, 5, 8));
};
