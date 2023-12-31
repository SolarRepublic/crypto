import {argon2id} from 'hash-wasm';


export type Argon2idConfig = {
	phrase: Uint8Array;
	salt: Uint8Array;
	iterations?: number;
	memory?: number;
	parallelism?: number;
	hashLen?: number;
};

export async function argon2id_hash(gc_argon: Argon2idConfig): Promise<Uint8Array> {
	return await argon2id({
		outputType: 'binary',
		password: gc_argon.phrase,
		salt: gc_argon.salt,
		iterations: gc_argon.iterations || 1,
		memorySize: Math.ceil((gc_argon.memory || 8 * 1024) / 1024),
		parallelism: gc_argon.parallelism || 1,
		hashLength: gc_argon.hashLen || 24,
	});
}
