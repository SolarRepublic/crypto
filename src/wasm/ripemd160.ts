import type {IHasher} from 'hash-wasm/dist/lib/WASMInterface';

import {createRIPEMD160} from 'hash-wasm';

let y_ripemd160: IHasher;
void createRIPEMD160().then((y_instance) => {
	y_ripemd160 = y_instance;
}, (e_load) => {
	console.error(`Failed to load ripemd160 WASM module:\n`+(e_load as Error).message);
});

export function ripemd160_ready(): boolean {
	return !!y_ripemd160;
}

export function ripemd160_sync(atu8_data: Uint8Array): Uint8Array {
	if(!y_ripemd160) throw new Error('Attempted to use synchronous sha256 before the WASM module finished loading, or it failed to load');

	y_ripemd160.init();
	y_ripemd160.update(atu8_data);
	return y_ripemd160.digest('binary');
}
