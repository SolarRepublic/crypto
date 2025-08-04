import {argon2id} from 'hash-wasm';

import {hasher_loader} from './_hash';


export type Argon2idConfig = {
	phrase: Uint8Array;
	salt: Uint8Array;
	iterations?: number;
	memory?: number;
	parallelism?: number;
	hashLen?: number;
};


const [argon2id_wasm_load, argon2id_wasm] = hasher_loader('argon2id', 20);

export {argon2id_wasm_load};

export const argon2id_wasm_hash = () => {

};

export async function argon2id_hash(gc_argon: Argon2idConfig): Promise<Uint8Array<ArrayBuffer>> {
	return await argon2id({
		outputType: 'binary',
		password: gc_argon.phrase,
		salt: gc_argon.salt,
		iterations: gc_argon.iterations || 1,
		memorySize: Math.ceil((gc_argon.memory || 8 * 1024) / 1024),
		parallelism: gc_argon.parallelism || 1,
		hashLength: gc_argon.hashLen || 24,
	}) as Uint8Array<ArrayBuffer>;
}
