import type {RuntimeKeyHandle} from './runtime-key';

import {ATU8_NIL, bytes, bytes_split, bytes_to_text, concat2, crypto_random_bytes, die, fold, sha256, subtle_derive_bits, subtle_import_key, text_to_bytes, zero_out, type Subtype} from '@blake.regalia/belt';


/**
 * Terminology:
 *  - entropy - the raw buffer of input bits (ENT)
 *  - checksum - between 4 and 8 bits (CS)
 *  - expanded - the concatenation of `entropy || checksum` (ENT+CS)
 *  - paddedMnemonic - a buffer of utf8-encoded text occupying the maximum possible length for the given
 * 		wordlist and phrase count, right-padded with zeroes to keep a consistent length when encrypted
 * 
 */

import {runtime_key_create} from './runtime-key';

export type DestroyableBytes = Subtype<Uint8Array, 'destroyable'>;
export type DestroyableUint16Array = Subtype<Uint16Array, 'destroyable'>;

// cache unicode space value
export const XB_UNICODE_SPACE = ' '.charCodeAt(0);

// prefix for mnemonic salt
const ATU8_UTF8_CONST_MNEMONIC = text_to_bytes('mnemonic');


const A_BIP39_LENGTHS = Array.from({length:8-4+1}, (w, i) => i+4)
	.map(ni_checksum => ({
		// number of entropy bits 
		ent: ni_checksum * 32,
		// number of checksum bits
		chk: ni_checksum,
		// length of sentence
		snt: (ni_checksum * 33) / 11,
	}));

const H_ENTROPY_LENGTHS = fold(A_BIP39_LENGTHS, g_length => ({
	[g_length.ent >>> 3]: g_length,
}));

const H_EXPANDED_LENGTHS = fold(A_BIP39_LENGTHS, g_length => ({
	[Math.ceil((g_length.ent + g_length.chk) / 8)]: g_length,
}));


const locate_char = (
	a_wordlist: string[],
	xb_find: number,
	ib_char: number,
	ib_lo: number,
	ib_hi: number
): number => {
	// binary search
	for(; ib_lo<ib_hi;) {
		// test index
		const ib_mid = (ib_lo + ib_hi) >>> 1;

		// deref value
		const xb_test = text_to_bytes(a_wordlist[ib_mid])[ib_char];

		// hit or miss high
		if(xb_test >= xb_find) {
			ib_hi = ib_mid;
		}
		// miss lo (including test undefined when word is too short)
		else {
			ib_lo = ib_mid + 1;
		}
	}

	// return index
	return ib_lo;
};

const locate_word = (a_wordlist: string[], atu8_word: Uint8Array): number => {
	// cache byte length
	const nb_chars = atu8_word.byteLength;

	// index range
	let ib_lo = 0;
	let ib_hi = a_wordlist.length;

	// each char
	for(let ib_char=0; ib_char<nb_chars && ib_lo<ib_hi; ib_char++) {
		// ref the character to find
		const xb_find = atu8_word[ib_char];

		// locate start index
		ib_lo = locate_char(a_wordlist, xb_find, ib_char, ib_lo, ib_hi);

		// locate stop index
		ib_hi = locate_char(a_wordlist, xb_find+1, ib_char, ib_lo, ib_hi);
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	const fe_fail = (_?: never) => die(`Mnemonic word does not exist in word list: "${bytes_to_text(atu8_word)}"`);

	// resolve
	const atu8_resolved = text_to_bytes(a_wordlist[ib_lo]);

	// check byte length
	if(nb_chars !== atu8_resolved.byteLength) fe_fail();

	// validate bytes match
	for(let ib_char=0; ib_char<nb_chars; ib_char++) {
		if(atu8_resolved[ib_char] !== atu8_word[ib_char]) fe_fail();
	}

	// return index
	return ib_lo;
};

// convert the concatenated bits to a sequence of wordlist indicies
const concated_bits_to_indicies = (atu8_range: Uint8Array): Uint16Array => Uint16Array.from([
	(atu8_range[0] << 3) | (atu8_range[1] >>> 5),
	(atu8_range[1] << 6) | (atu8_range[2] >>> 2),
	(atu8_range[2] << 9) | (atu8_range[3] << 1) | (atu8_range[4] >>> 7),
	(atu8_range[4] << 4) | (atu8_range[5] >>> 4),
	(atu8_range[5] << 7) | (atu8_range[6] >>> 1),
	(atu8_range[6] << 10) | (atu8_range[7] << 2) | (atu8_range[8] >>> 6),
	(atu8_range[8] << 5) | (atu8_range[9] >>> 3),
	(atu8_range[9] << 8) | atu8_range[10],
].map(xb => 0x7ff & xb));


/**
 * Convert a decoded mnemonic key into a seed key
 * @param atu8_mnemonic 
 * @param atu8_salt 
 * @returns 
 */
export const bip39_mnemonic_to_seed = async(
	atu8_mnemonic: DestroyableBytes,
	atu8_passphrase: Uint8Array=ATU8_NIL
): Promise<RuntimeKeyHandle> => {
	// import mnemonic to key
	const dk_mnemonic = await subtle_import_key('raw', atu8_mnemonic, 'PBKDF2', false, ['deriveBits']);

	// destroy mnemonic
	zero_out(atu8_mnemonic);

	// derive 512-bits
	const atu8_derived = bytes(await subtle_derive_bits({
		name: 'PBKDF2',
		salt: concat2(ATU8_UTF8_CONST_MNEMONIC, atu8_passphrase),
		iterations: 2048,
		hash: 'SHA-512',
	}, dk_mnemonic, 512));

	// turn into key
	return await runtime_key_create(atu8_derived, 512);
};



// /**
//  * Convert a decoded mnemonic key into a seed key
//  * @param atu8_mnemonic 
//  * @param atu8_salt 
//  * @returns 
//  */
// export const bip39_mnemonic_to_seed = async(
// 	krk_mnemonic: RuntimeKeyHandle,
// 	krk_passphrase: RuntimeKeyHandle
// ): Promise<RuntimeKeyHandle> => {
// 	// import mnemonic to key
// 	const dk_mnemonic = await runtime_key_access(krk_mnemonic, atu8 => subtle_import_key('raw', atu8, 'PBKDF2', false, ['deriveBits']));

// 	// derive 512-bits
// 	const atu8_derived = bytes(await runtime_key_access(
// 		krk_passphrase,
// 		atu8_passphrase => subtle_derive_bits({
// 			name: 'PBKDF2',
// 			salt: concat2(ATU8_UTF8_CONST_MNEMONIC, atu8_passphrase),
// 			iterations: 2048,
// 			hash: 'SHA-512',
// 		}, dk_mnemonic, 512)));

// 	// turn into key
// 	return await runtime_key_create(atu8_derived, 512);
// };


// export type MnemonicTuple = [
// 	atu8_words: Uint8Array,
// 	nl_words: number,
// ];

// /**
//  * Parses a mnemonic string into bytes, canonicalizing it as necessary
//  */
// export const bip39_mnemonic_parse = (
// 	s_mnemonic: string,
// 	nl_words?: never  // eslint-disable-line @typescript-eslint/naming-convention
// ): MnemonicTuple => [
// 	text_to_bytes(
// 		call_with(
// 			s_mnemonic.trim().toLowerCase().split(/\s+/g),
// 			// eslint-disable-next-line no-sequences
// 			a => ((nl_words as unknown as number)=a.length, a)
// 		).join(' ').normalize('NFKD')),
// 	nl_words as unknown as number,
// ];

/**
 * Parses a mnemonic string into bytes, canonicalizing it as necessary
 */
export const bip39_mnemonic_parse = (
	s_mnemonic: string
): Uint8Array => text_to_bytes(s_mnemonic.trim().toLowerCase().split(/\s+/g).join(' ').normalize('NFKD'));

/**
 * Parses a passphrase string into bytes, normalizing the encoding
 */
export const bip39_passphrase_parse = (
	s_passphrase: string
): Uint8Array => text_to_bytes(s_passphrase.normalize('NFKD'));


/**
 * Validate the given expanded form bytes, verifying the terminal checksum byte
 * @param atu8_expanded 
 * @returns 
 */
export const bip39_expanded_validate = async(
	atu8_expanded: Uint8Array
): Promise<boolean> => {
	// expect a valid length
	const g_length = H_EXPANDED_LENGTHS[atu8_expanded.byteLength];
	if(!g_length) die(`Invalid BIP-39 expanded entropy byte length: ${atu8_expanded.byteLength}`);

	// generate checksum
	const nb_entropy = g_length.ent >> 3;
	const atu8_hash = await sha256(atu8_expanded.subarray(0, nb_entropy));

	// compute checksum mask
	const ni_shift = 8 - g_length.chk;
	const xm_checksum = (0xff >>> ni_shift) << ni_shift;

	// validity depends on checksums matching
	const b_valid = (atu8_hash[0] & xm_checksum) === (atu8_expanded[nb_entropy] & xm_checksum);

	// zero out hash
	zero_out(atu8_hash);

	// return validity
	return b_valid;
};


/**
 * Convert a given 32-byte entropy to expanded form by appending its checksum byte
 * @param fk_entropy 
 * @returns 
 */
export const bip39_entropy_to_expanded = async(
	atu8_entropy: DestroyableBytes
): Promise<Uint8Array> => {
	// expect a valid length
	const g_length = H_ENTROPY_LENGTHS[atu8_entropy.byteLength];
	if(!g_length) die('Invalid BIP-39 raw entropy byte length: '+atu8_entropy.byteLength);

	// start by hashing the entropy for the checksum
	const atu8_hash = await sha256(atu8_entropy);

	// prep checksum byte
	const ni_shift = 8 - g_length.chk;
	const xb_checksum = atu8_hash[0] & ((0xff >> ni_shift) << ni_shift);

	// produce expanded form: entropy || checksum
	const atu8_concat = concat2(atu8_entropy, Uint8Array.from([xb_checksum]));

	// destroy sensitive key material
	zero_out(atu8_entropy);
	zero_out(atu8_hash);

	// return expanded form
	return atu8_concat;
};


/**
 * Converts the given canonicalized mnemonic into wordlist indicies
 * @param a_wordlist 
 * @param atu8_mnemonic 
 * @returns 
 */
export const bip39_mnemonic_to_indicies = (
	a_wordlist: string[],
	atu8_mnemonic: DestroyableBytes
): Uint16Array => {
	// intercept any errors in order wipe sensitive data
	let atu16_indicies = new Uint16Array(0);
	try {
		// split mnemonic into secret words by reference
		const a_secrets = bytes_split(atu8_mnemonic, XB_UNICODE_SPACE);

		// convert to indices
		atu16_indicies = new Uint16Array(a_secrets.length).map((w_ignore, i_word) => locate_word(a_wordlist, a_secrets[i_word]));

		// convert indicies to entropy
		return atu16_indicies;
	}
	// intercept any errors
	finally {
		// destroy mnemonic
		zero_out(atu8_mnemonic);

		// destroy indicies
		zero_out(atu16_indicies);
	}
};


/**
 * Converts the given expanded bytes into a list of indicies
 * @param atu8_expanded 
 * @returns 
 */
export const bip39_expanded_to_indicies = async(
	atu8_expanded: Uint8Array
): Promise<Uint16Array> => {
	// intercept any errors in order to destroy the expanded bytes
	try {
		// lookup length definition
		const g_length = H_EXPANDED_LENGTHS[atu8_expanded.byteLength];
		if(!g_length) die(`Invalid BIP-39 expanded entropy byte length: ${atu8_expanded.byteLength}`);

		// generate checksum
		const nb_entropy = g_length.ent >> 3;
		const atu8_hash = await sha256(atu8_expanded.subarray(0, nb_entropy));

		// compute checksum mask
		const ni_shift = 8 - g_length.chk;
		const xm_checksum = (0xff >>> ni_shift) << ni_shift;

		// copy checksum value
		const xb_checksum = atu8_hash[0] & xm_checksum;

		// zero out hash
		zero_out(atu8_hash);

		// bad checksum
		if(xb_checksum !== (atu8_expanded[nb_entropy] & xm_checksum)) die(`Invalid BIP-39 checksum`);

		// convert concatenated key bits to indices
		const atu16_range_0 = concated_bits_to_indicies(atu8_expanded.subarray(0, 11));
		const atu16_range_1 = concated_bits_to_indicies(atu8_expanded.subarray(11, 22));
		const atu16_range_2 = concated_bits_to_indicies(atu8_expanded.subarray(22, 33));

		// wipe expanded data now
		zero_out(atu8_expanded);

		// build contiguous indicies buffer
		const atu16_indicies = Uint16Array.from([
			...atu16_range_0,
			...atu16_range_1,
			...atu16_range_2,
		]);

		// zero out ranges
		zero_out(atu16_range_0);
		zero_out(atu16_range_1);
		zero_out(atu16_range_2);

		// return indicies
		return atu16_indicies.subarray(0, g_length.snt);
	}
	// destroy sensitive key material
	finally {
		zero_out(atu8_expanded);
	}
};

/**
 * Given 32-byte entropy, generate the list of indicies
 * @param atu8_entropy 
 * @returns a {@link Uint16Array}[] from a contiguous ArrayBuffer
 */
export const bip39_entropy_to_indicies = async(
	atu8_entropy: DestroyableBytes | undefined=crypto_random_bytes(32) as DestroyableBytes
): Promise<Uint16Array> => {
	// use or generate new random entropy and expand
	const atu8_expanded = await bip39_entropy_to_expanded(atu8_entropy);

	// convert to indicies
	try {
		return await bip39_expanded_to_indicies(atu8_expanded);
	}
	// wipe intermediate expanded form
	finally {
		zero_out(atu8_expanded);
	}
};

/**
 * Converts the given list of indicies into entropy bytes
 * @param atu16_indicies 
 * @returns 
 */
export const bip39_indicies_to_expanded = (
	atu16_indicies: DestroyableUint16Array
): Uint8Array => {
	// cache number of words
	const nl_words = atu16_indicies.length;

	// invalid word length; panic wipe and throw
	if(0 !== nl_words % 3) {
		zero_out(atu16_indicies);
		die('Mnemonic word count is not a multiple of 3');
	}

	// prep entropy buffer
	const atu8_entropy = bytes(Math.ceil((nl_words * 11) / 8));

	// the pattern looks like this:
	//      8 8 8 8 8 8 8 8 8 8 8
	// 0 |  8+3                    = 11
	// 1 |    5+6                  = 11
	// 2 |      2+8+1              = 11
	// 3 |          7+4            = 11
	// 4 |            4+7          = 11
	// 5 |              1+8+2      = 11
	// 6 |                  6+5    = 11
	// 7 |                    3+8  = 11
	// 
	// mask values to get the bottom n bits:
	//   8: 0xff   4: 0x0f
	//   7: 0x7f   3: 0x07
	//   6: 0x3f   2: 0x03
	//   5: 0x1f   1: 0x0f

	// index value of the secret word
	let xb_secret = 0;

	// attempt to transcode bits
	try {
		let i_word = 0;

		for(let i_group=0; ; i_group++) {
			const atu16_read = atu16_indicies.subarray(i_group*8);
			const atu8_write = atu8_entropy.subarray(i_group*11);

			xb_secret = atu16_read[0];
			atu8_write[0] = xb_secret >>> 3;
			atu8_write[1] = (xb_secret & 0x07) << 5;

			if(++i_word >= nl_words) break;

			xb_secret = atu16_read[1];
			atu8_write[1] |= xb_secret >>> 6;
			atu8_write[2] = (xb_secret & 0x3f) << 2;

			// 18 words checkpoint
			if(++i_word >= nl_words) break;

			xb_secret = atu16_read[2];
			atu8_write[2] |= xb_secret >>> 9;
			atu8_write[3] = (xb_secret >>> 1) & 0xff;
			atu8_write[4] = (xb_secret & 0x01) << 7;

			if(++i_word >= nl_words) break;

			xb_secret = atu16_read[3];
			atu8_write[4] |= xb_secret >>> 4;
			atu8_write[5] = (xb_secret & 0x0f) << 4;

			// 12 words checkpoint
			if(++i_word >= nl_words) break;

			xb_secret = atu16_read[4];
			atu8_write[5] |= xb_secret >>> 7;
			atu8_write[6] = (xb_secret & 0x7f) << 1;

			// 21 words checkpoint
			if(++i_word >= nl_words) break;

			xb_secret = atu16_read[5];
			atu8_write[6] |= xb_secret >>> 10;
			atu8_write[7] = (xb_secret >> 2) & 0xff;
			atu8_write[8] = (xb_secret & 0x03) << 6;

			if(++i_word >= nl_words) break;

			xb_secret = atu16_read[6];
			atu8_write[8] |= xb_secret >>> 5;
			atu8_write[9] = (xb_secret & 0x1f) << 3;

			// 15 words checkpoint
			if(++i_word >= nl_words) break;

			xb_secret = atu16_read[7];
			atu8_write[9] |= xb_secret >>> 8;
			atu8_write[10] = xb_secret & 0xff;

			// 24 words
			if(++i_word >= nl_words) break;
		}
	}
	// intercept any errors
	finally {
		// wipe the indicies
		zero_out(atu16_indicies);

		// zero out any entropy that was partially decoded
		zero_out(atu8_entropy);
	}

	return atu8_entropy;
};


/**
 * Converts the given canonicalized mnemonic to expanded form
 * @param a_wordlist 
 * @param atu8_words 
 * @returns 
 */
export const bip39_mnemonic_to_entropy = (
	a_wordlist: string[],
	atu8_words: DestroyableBytes
): Promise<RuntimeKeyHandle> => {
	// convert mnemonic to indicies
	const atu16_indicies = bip39_mnemonic_to_indicies(a_wordlist, atu8_words) as DestroyableUint16Array;

	// count number of words
	const nl_words = atu16_indicies.length;

	// number of entropy bits
	const ni_entropy = (nl_words * 11) - (nl_words / 3);

	// convert indicies to expanded form
	const atu8_expanded = bip39_indicies_to_expanded(atu16_indicies);

	// create runtime key
	return runtime_key_create(async() => {
		try {
			// validate expanded
			if(!await bip39_expanded_validate(atu8_expanded)) die('Invalid BIP-39 mnemonic checksum');

			// remove checksum and create key around raw entropy
			return atu8_expanded.slice(0, ni_entropy >>> 3);
		}
		// wipe expanded bytes
		finally {
			zero_out(atu8_expanded);
		}
	}, ni_entropy);
};

