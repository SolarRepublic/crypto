import {ATU8_SHA256_STARSHELL} from './constants.js';


export class AesGcmEncryptionError extends Error {
	constructor(public original: Error) {
		super('Failed to encrypt data: '+original);
	}
}

export class AesGcmDecryptionError extends Error {
	constructor(public original: Error) {
		super('Failed to decrypt data: '+original);
	}
}


export async function aes_gcm_encrypt(
	atu8_data: Uint8Array,
	dk_key: CryptoKey,
	atu8_nonce: Uint8Array,
	atu8_verify=ATU8_SHA256_STARSHELL,
	ni_tag=128
): Promise<Uint8Array> {
	try {
		return new Uint8Array(await crypto.subtle.encrypt({
			name: 'AES-GCM',
			iv: atu8_nonce,
			additionalData: atu8_verify,
			tagLength: ni_tag,
		}, dk_key, atu8_data) as Uint8Array);
	}
	catch(e_encrypt) {
		throw new AesGcmEncryptionError(e_encrypt as Error);
	}
}

export async function aes_gcm_decrypt(
	atu8_data: Uint8Array,
	dk_key: CryptoKey,
	atu8_nonce: Uint8Array,
	atu8_verify=ATU8_SHA256_STARSHELL,
	ni_tag=128
): Promise<Uint8Array> {
	try {
		return new Uint8Array(await crypto.subtle.decrypt({
			name: 'AES-GCM',
			iv: atu8_nonce,
			additionalData: atu8_verify,
			tagLength: ni_tag,
		}, dk_key, atu8_data) as Uint8Array);
	}
	catch(e_decrypt) {
		throw new AesGcmDecryptionError(e_decrypt as Error);
	}
}
