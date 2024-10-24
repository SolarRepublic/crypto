import type {IHasher} from 'hash-wasm/dist/lib/WASMInterface';

import {die, timeout_exec} from '@blake.regalia/belt';

let y_sha256: IHasher;

export const sha256_wasm_load = async(xt_wait=Infinity): Promise<IHasher> => y_sha256
	?? await timeout_exec(xt_wait, async() => (await import('hash-wasm/dist/lib/sha256')).createSHA256())
		.then(([y_hasher]) => y_sha256 = y_hasher!)
	?? die('Failed to load SHA-256 WASM module');

export const sha256_wasm = (atu8_data: Uint8Array): Uint8Array => y_sha256?.init().update(atu8_data).digest('binary')
	?? die('SHA-256 WASM module not ready or failed to load');


// void createSHA256().then((y_instance) => {
// 	y_sha256 = y_instance;
// }, (e_load) => {
// 	console.error(`Failed to load sha256 WASM module:\n`+(e_load as Error).message);
// });

// export function sha256_ready(): boolean {
// 	return !!y_sha256;
// }

// export function sha256_sync(atu8_data: Uint8Array): Uint8Array {
// 	if(!y_sha256) throw new Error('Attempted to use synchronous sha256 before the WASM module finished loading, or it failed to load');

// 	y_sha256.init();
// 	y_sha256.update(atu8_data);
// 	return y_sha256.digest('binary');
// }
