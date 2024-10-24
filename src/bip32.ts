import type {KeyProducer, RuntimeKeyHandle} from './runtime-key';
import type {NaiveBase58} from '@blake.regalia/belt';


import {bytes, bytes_to_base58, concat2, dataview, die, hmac, sha256, subtle_import_key, subtle_sign, text_to_bytes, zero_out} from '@blake.regalia/belt';

import {ripemd160_any_sync} from './ripemd160';
import {resolve_key_producer, runtime_key_access, runtime_key_create} from './runtime-key';
import {secp256k1_sk_to_pk, secp256k1_tweak_sk_add, secp256k1_valid_sk} from './secp256k1';
import {HM_PRIVATES} from './util';


/**
 * Bip32 handle
 * 
 *  - `id: Uint8Array` - identifier
 *  - `fp: Uint8Array` - fingerprint
 *  - `im: boolean` - whether this is the master node
 *  - `pk33: Uint8Array` - 33-byte public key
 *  - `d: number` - depth uint32
 */
export type Bip32Handle = {
	/**
	 * identifier
	 */
	id: Uint8Array;

	/**
	 * fingerprint
	 */
	fp: Uint8Array;

	/**
	 * is the master node?
	 */
	im: boolean;

	/**
	 * 33-byte public key
	 */
	pk33: Uint8Array;

	/**
	 * depth
	 */
	d: number;
};

// the private fields of a Bip32 instance
type Bip32PrivateFields = [
	k_sk: RuntimeKeyHandle,
	atu8_chain: Uint8Array,
	atu8_parent: Uint8Array,
	i_index: number,
];


// 2^31
const N_BIP32_HARDENED = 0x80000000;

// private mainnet
const XB_VERSION_BITCOIN_PRIVATE = 0x0488ade4;

// root nil fingerprint
const ATU8_FINGERPRINT_NIL = bytes(4);

// create the master 'Bitcoin seed' hmac key
let DK_BIP32_KEY_MASTER_GEN: CryptoKey;
void subtle_import_key('raw', text_to_bytes('Bitcoin seed'), {
	name: 'HMAC',
	hash: {name:'SHA-512'},
}, false, ['sign']).then(dk => DK_BIP32_KEY_MASTER_GEN = dk);


// cast privates weak map for local use
const hm_privates = HM_PRIVATES as WeakMap<Bip32Handle, Bip32PrivateFields>;



export const bip32_create = async(
	k_sk: RuntimeKeyHandle,
	atu8_chain: Uint8Array,
	atu8_parent=ATU8_FINGERPRINT_NIL,
	i_depth=0,
	i_index=0,
	k_parent: Bip32Handle | null=null
) => {
	// access the runtime key data
	const atu8_pk33 = await runtime_key_access(k_sk, secp256k1_sk_to_pk);

	// create the identifier
	const atu8_id = ripemd160_any_sync(atu8_pk33);

	// create instance
	const k_bip32: Bip32Handle = {
		id: atu8_id,
		fp: atu8_id.subarray(0, 4),
		im: atu8_parent.every(xb => 0 === xb),
		pk33: atu8_pk33,
		d: i_depth,
	};

	// set private fields
	hm_privates.set(k_bip32, [
		k_sk,
		atu8_chain,
		atu8_parent,
		i_index,
		// k_parent,
	]);

	// return instance
	return k_bip32;
};

export const bip32_from_master = async(z_seed: KeyProducer): Promise<Bip32Handle> => {
	// create seed
	const atu8_seed = await resolve_key_producer(z_seed);

	// safety checks
	{
		// seed too short
		if(atu8_seed.byteLength < 16) {
			// panic wipe
			zero_out(atu8_seed);
			die('Seed is too short');
		}
		// seed too long
		else if(atu8_seed.byteLength > 64) {
			// panic wipe
			zero_out(atu8_seed);
			die('Seed is too long');
		}
	}

	// generate the master `I`
	const atu8_i = bytes(await subtle_sign('HMAC', DK_BIP32_KEY_MASTER_GEN, atu8_seed));

	// wipe
	zero_out(atu8_seed);

	// split into two 32-byte sequences `I_L` and `I_R`
	const atu8_il = atu8_i.subarray(0, 32);
	const atu8_ir = atu8_i.subarray(32);

	// invalid master secret key
	if(!secp256k1_valid_sk(atu8_il)) {
		// panic wipe
		zero_out(atu8_i);
		die('Invalid master key');
	}

	// wrap as runtime key
	const k_sk = await runtime_key_create(atu8_il);

	// create bip32
	return bip32_create(k_sk, atu8_ir);
};

/**
 * Serializes the given BIP-32 node
 * @param k_bip32 
 * @returns 
 */
export const bip32_serialize = async(k_bip32: Bip32Handle): Promise<Uint8Array> => {
	// destructure private fields
	const [
		k_sk,
		atu8_chain,
		atu8_parent,
		i_index,
	] = hm_privates.get(k_bip32)!;

	// prep seed's serialization buffer
	const atu8_seed = bytes(78);

	// prep data view for serializing multi-byte uints
	const dv_seed = dataview(atu8_seed.buffer);

	// safety checks
	if(32 !== atu8_chain.byteLength) die('Critical error: chain code is not exactly 32 bytes');

	// > 4 bytes: version bytes (mainnet: 0x0488B21E public, 0x0488ADE4 private; testnet: 0x043587CF public, 0x04358394 private)
	dv_seed.setUint32(0, XB_VERSION_BITCOIN_PRIVATE, false);

	// > 1 byte: depth: 0x00 for master nodes, 0x01 for level-1 derived keys, ...
	dv_seed.setUint8(4, k_bip32.d);

	// > 4 bytes: the fingerprint of the parent's key (0x00000000 if master key)
	atu8_seed.set(atu8_parent, 5);

	// > 4 bytes: child number
	dv_seed.setUint32(9, i_index);

	// > 32 bytes: the chain code
	atu8_seed.set(atu8_chain, 13);

	// > 33 bytes: the private key data as 0x00 || ser256(k)
	dv_seed.setUint8(45, 0);
	await runtime_key_access(k_sk, atu8_sk => atu8_seed.set(atu8_sk, 46));

	// 
	return atu8_seed;
};

/**
 * Exports the given BIP-32 node to a base58 string
 * @param k_bip32 
 * @returns 
 */
export const bip32_export_base58 = async(k_bip32: Bip32Handle): Promise<NaiveBase58> => {
	// serialize bip32 node
	const atu8_serialized = await bip32_serialize(k_bip32);

	// hash
	const atu8_hash = await sha256(await sha256(atu8_serialized));

	// serialize(node) || checksum(serialize(node))
	const atu8_data = concat2(atu8_serialized, atu8_hash.subarray(0, 4));

	// wipe secret material
	zero_out(atu8_serialized);

	// serialize to base58
	return bytes_to_base58(atu8_data);
};

/**
 * <https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#child-key-derivation-ckd-functions>
 */
export const bip32_derive = async(
	k_bip32: Bip32Handle,
	i_child: number
) => {
	// destructure private field
	const [
		k_sk,
		atu8_chain,
		atu8_parent,
		i_index,
	] = hm_privates.get(k_bip32)!;

	// prep data bytes
	const atu8_data = bytes(1 + 32 + 4);

	// with secret key
	await runtime_key_access(k_sk, (atu8_sk) => {
		// safety check private key
		if(!secp256k1_valid_sk(atu8_sk)) die('Invalid private key key');

		// child is a hardened key
		if(i_child >= N_BIP32_HARDENED) {
			// > Data = 0x00 || ser256(kpar) || ser32(i)
			atu8_data[0] = 0x00;

			// copy private ky into data
			atu8_data.set(atu8_sk, 1);
		}
		// child is a normal key
		else {
			// > Data = serP(point(kpar)) || ser32(i)
			atu8_data.set(k_bip32.pk33, 0);
		}

		// write ser32(i)
		dataview(atu8_data.buffer).setUint32(atu8_data.byteOffset+33, i_child, false);
	});

	// > let I = HMAC-SHA512(Key = cpar, Data
	const atu8_i = await hmac(atu8_chain, atu8_data, 'SHA-512');

	// clean up intermediate data
	zero_out(atu8_data);

	// > Split I into two 32-byte sequences, IL and IR.
	const atu8_il = atu8_i.subarray(0, 32);
	const atu8_ir = atu8_i.subarray(32);

	// > In case parse256(IL) ≥ n or ki = 0
	if(!secp256k1_valid_sk(atu8_il)) {
		// panic wipe
		zero_out(atu8_i);

		// > proceed with the next value for i
		return bip32_derive(k_bip32, i_child + 1);
	}

	// > Private parent key → private child key
	{
		// > ki = parse256(IL) + kpar (mod n)
		const atu8_ki = await runtime_key_access(k_sk, atu8_sk => secp256k1_tweak_sk_add(atu8_sk, atu8_il));

		// > In case parse256(IL) ≥ n or ki = 0
		if(!secp256k1_valid_sk(atu8_ki)) {
			// panic wipe
			zero_out(atu8_i);
			zero_out(atu8_ki);

			// > proceed with the next value for i
			return bip32_derive(k_bip32, i_child + 1);
		}

		// create child key
		const k_child = await runtime_key_create(atu8_ki);

		// return as child bip32 node
		return await bip32_create(k_child, atu8_ir, k_bip32.fp, k_bip32.d+1, i_child);
	}
};


