import type {IHasher} from 'hash-wasm/dist/lib/WASMInterface';

import {createSHA256} from 'hash-wasm';

let y_sha256: IHasher;
void createSHA256().then((y_instance) => {
	y_sha256 = y_instance;
}, (e_load) => {
	console.error(`Failed to load sha256 WASM module:\n`+(e_load as Error).message);
});

export function sha256_ready(): boolean {
	return !!y_sha256;
}

export function sha256_sync(atu8_data: Uint8Array): Uint8Array {
	if(!y_sha256) throw new Error('Attempted to use synchronous sha256 before the WASM module finished loading, or it failed to load');

	y_sha256.init();
	y_sha256.update(atu8_data);
	return y_sha256.digest('binary');
}
