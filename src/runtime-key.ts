import {assign, bytes, crypto_random_bytes, die, is_function, subtle_derive_bits, subtle_import_key, zeroize} from '@blake.regalia/belt';

import {HM_PRIVATES, random_bytes} from './util.js';


/**
 * Callback that returns or resolves to a private key as an Uint8Array.
 */
export type KeyProducer<dc_type extends ArrayBufferView=Uint8Array> = dc_type | (() => dc_type | Promise<dc_type>);

// runtime key handle
export type RuntimeKeyHandle = Record<never, never>;

// the private fields of a RuntimeKey instance
type RuntimePrivateKeyFields = [
	atu8_salt: Uint8Array,
	ni_bits: number,
	dk_base: CryptoKey,
	atu8_xor: Uint8Array,
];

/**
 * Resolves a key producer to bytes
 * @param z_key 
 * @returns 
 */
export const key_producer_resolve = async<w_key extends ArrayBufferView>(
	z_key: KeyProducer<w_key>
): Promise<w_key> => ArrayBuffer.isView(z_key)
	? z_key: is_function(z_key)
		? await z_key()
		: die('Invalid key producer', z_key);

/**
 * Fetch a derived key deterministically given some salt and optional info.
 */
const fetch_derived = async(
	dk_base: CryptoKey,
	atu8_salt: Uint8Array,
	ni_bits=256,
	atu8_info=bytes(0)
): Promise<Uint8Array> => bytes(await subtle_derive_bits({
	name: 'HKDF',
	hash: 'SHA-256',
	salt: atu8_salt,
	info: atu8_info,
}, dk_base, ni_bits));

/**
 * XOR two equal-sized byte arrays
 * @param atu8_a 
 * @param atu8_b 
 * @returns 
 */
const xor_bytes = (atu8_a: Uint8Array, atu8_b: Uint8Array) => bytes(atu8_a.map((xb, ib) => xb ^ atu8_b[ib]));

/**
 * Creates a one-time pad for encrypting the private key in memory.
 * {@link https://en.wikipedia.org/wiki/One-time_pad}
 * 
 * Given a private key 's', derive two 256-bit keys (v, t) such that `v XOR t = s` .
 * The purpose of creating (v, t) is to conceal the private key when secure key options are not
 * available on the system (e.g., Web Crypto does not support secp256k1 private keys).
 * 
 * Instead, generate a random base key and import it into a new CryptoKey object that is not extractable
 * and can only be used to derive bits. The reasononing behind not simply making this key extractable is
 * to be able to derive new keys of any length.
 * 
 * Using the base key object, derive bits to produce the 'derived' key 'v'.
 * 
 * The next step is to compute the delta key 't' such that `v XOR t = s`.
 * 
 * Finally, wipe all intermediate buffers. At this point, the salt needed for deriving the 'derived' key,
 * and the 'delta' key are the only relevant data stored in process memory. The complementary 'base' key
 * is accessible via reference to a CryptoKey object, ideally stored in cryptographically secure subsystems.
 * 
 * Any time the private key is needed for signing (or any other task, all of which must happen in-process),
 * the steps are:
 *   - acquire references to the base key CryptoKey and the salt Uint8Array
 *   - asynchronously derive the 'derived' key using the base key
 *   - acquire reference to the 'delta' key
 *   - compute private key by performing `derived_key XOR delta_key`
 *   - use the private key
 *   - wipe the derived key and private key buffers
 * 
 * Overall, this does not add a great deal of protection against a sufficiently privileged & capable attacker,
 * however, it does (albeit under ideal circumstances) reduce the amount of time the private key exists at
 * a single location within process memory, thus reducing its temporal footprint.
 */
async function generate_pair(zk_sk: KeyProducer, atu8_salt: Uint8Array, ni_bits=256): Promise<[CryptoKey, Uint8Array]> {
	// derive a random 256-bit 'one-time pad' key
	const atu8_otp = random_bytes(Math.ceil(ni_bits / 8));

	// import the base key into a new managed key object that can derive bits
	const dk_base = await subtle_import_key('raw', atu8_otp, {
		name: 'HKDF',
		hash: 'SHA-256',
	}, false, ['deriveBits']);

	// wipe the base key from memory
	zeroize(atu8_otp);

	// fetch the 'one-time pad' key
	const atu8_derived = await fetch_derived(dk_base, atu8_salt, ni_bits);

	// fetch private key
	const atu8_sk = await key_producer_resolve(zk_sk);

	// compute the delta key
	const atu8_xor = xor_bytes(atu8_derived, atu8_sk);

	// wipe the private key from memory
	zeroize(atu8_sk);

	// wipe the derived key from memory
	zeroize(atu8_derived);

	// return the base key and one-time pad key
	return [dk_base, atu8_xor];
}


// // stores the private fields of an RuntimeKey instance
// const hm_privates = new Map<RuntimeKey, RuntimePrivateKeyFields>();
const hm_privates = HM_PRIVATES as WeakMap<RuntimeKeyHandle, RuntimePrivateKeyFields>;

/**
 * Creates a new runtime key instance
 * @param fk_sk - 
 * @param ni_bits - 
 * @returns 
 */
export const runtime_key_create = async(zk_sk: KeyProducer, ni_bits=256): Promise<RuntimeKeyHandle> => {
	// create instance
	const k_instance: RuntimeKeyHandle = {};

	// create salt
	const atu8_salt = crypto_random_bytes(32);

	// create private fields instance
	const a_private = [
		atu8_salt,
		ni_bits,
	] as unknown as RuntimePrivateKeyFields;

	// save to privates map
	hm_privates.set(k_instance, a_private);

	// generate key pair
	const [dk_base, atu8_xor] = await generate_pair(zk_sk, atu8_salt, ni_bits);

	// update private fields
	assign(a_private, [,, dk_base, atu8_xor]);

	// return instance
	return k_instance;
};

/**
 * Access the private data for the runtime key instance
 * @param k_key 
 * @param fk_use 
 * @returns 
 */
export const runtime_key_access = async<w_return=unknown>(
	k_key: RuntimeKeyHandle,
	fk_use: (atu8_sk: Uint8Array) => w_return
): Promise<w_return> => {
	// ref and destructure private fields
	const [atu8_salt, ni_bits, dk_base, atu8_xor] = hm_privates.get(k_key)!;

	// prepare to capture whatever the callback does
	let w_return!: w_return;
	let e_thrown: unknown;

	// prep a temporary use buffer
	let atu8_use!: Uint8Array;

	// prepare the next one-time pad
	const [dk_base_new, atu8_xor_new] = await generate_pair(() => new Promise(async(fk_resolve) => {
		// fetch the 'derived' key
		const atu8_derived = await fetch_derived(dk_base, atu8_salt, ni_bits);

		// compute the private key
		const atu8_sk = xor_bytes(atu8_xor, atu8_derived);

		// wipe the derived key
		zeroize(atu8_derived);

		// copy the key for use
		atu8_use = atu8_sk.slice();

		// attempt to perform synchronous callback
		try {
			// allow the caller to use the private key
			w_return = fk_use(atu8_use);
		}
		// catch whatever was thrown and save it
		catch(_e_thrown) {
			e_thrown = _e_thrown;

			// immediately wipe the use buffer
			zeroize(atu8_use);
		}

		// callback generate pair; will zeroize given bytes
		fk_resolve(atu8_sk);
	}), atu8_salt, ni_bits);

	// rotate keys
	assign(hm_privates.get(k_key)!, [,, dk_base_new, atu8_xor_new]);

	// emulate whatever the callback did
	if(e_thrown) {
		throw e_thrown;  // eslint-disable-line @typescript-eslint/only-throw-error
	}
	// return whatever the caller returned
	else {
		// resolve it first
		const w_resolved = await w_return;

		// wipe the used key
		zeroize(atu8_use);

		// return resolved value
		return w_resolved;
	}
};

/**
 * Destroy the private data stored in the runtime key instance
 * @param k_key 
 */
export const runtime_key_destroy = (k_key: RuntimeKeyHandle): void => {
	// destructure fields
	const [atu8_salt,,, atu8_xor] = hm_privates.get(k_key)!;

	// remove otp
	zeroize(atu8_xor);

	// clear salt
	zeroize(atu8_salt);

	// remove pointer
	hm_privates.delete(k_key);
};

/**
 * Clone the private data stored in the runtime key instance
 * @param k_key 
 * @returns 
 */
export const runtime_key_clone = async(k_key: RuntimeKeyHandle): Promise<RuntimeKeyHandle> => await runtime_key_access(k_key, atu8_sk => runtime_key_create(() => atu8_sk.slice()));
