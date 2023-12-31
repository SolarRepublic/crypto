// import type {IHasher} from 'hash-wasm/dist/lib/WASMInterface';

// import {createHMAC} from 'hash-wasm';

// let y_hmac: IHasher;
// void createHMAC().then((y_instance) => {
// 	y_hmac = y_instance;
// }, (e_load) => {
// 	console.error(`Failed to load ripemd160 WASM module:\n`+(e_load as Error).message);
// });

// export function hmac_ready(): boolean {
// 	return !!y_hmac;
// }

// export function hmac_sync(atu8_data: Uint8Array): Uint8Array {
// 	if(!y_hmac) throw new Error('Attempted to use synchronous sha256 before the WASM module finished loading, or it failed to load');

// 	y_hmac.init();
// 	y_hmac.update(atu8_data);
// 	return y_hmac.digest('binary');
// }
