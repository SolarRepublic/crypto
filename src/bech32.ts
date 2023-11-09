import type {CwAccountAddr} from '@solar-republic/types';

import {base64_to_buffer} from '@blake.regalia/belt';
import {fromBech32, toBech32} from '@cosmjs/encoding';

import {ripemd160_sync} from './wasm/ripemd160.js';
import {sha256_sync} from './wasm/sha256.js';


export function pubkey_to_bech32(z_pubkey: string | Uint8Array, si_hrp: string): CwAccountAddr {
	const atu8_pk = 'string' === typeof z_pubkey? base64_to_buffer(z_pubkey): z_pubkey;
	if(!(atu8_pk instanceof Uint8Array)) {
		throw new TypeError(`Pubkey argument must be a Uint8Array or base64-encoded string`);
	}

	// perform sha-256 hashing on the public key
	const atu8_sha256 = sha256_sync(atu8_pk);

	// perform ripemd-160 hashing on the result
	const atu8_ripemd160 = ripemd160_sync(atu8_sha256);

	// convert to bech32 string
	return toBech32(si_hrp, atu8_ripemd160) as CwAccountAddr;
}


export function bech32_to_buffer(sa_addr: CwAccountAddr): Uint8Array {
	return fromBech32(sa_addr).data;
}

export function buffer_to_bech32(atu8_data: Uint8Array, s_hrp: string): CwAccountAddr {
	return toBech32(s_hrp, atu8_data) as CwAccountAddr;
}
