/* eslint-disable implicit-arrow-linebreak */
import {try_sync} from '@blake.regalia/belt';

import {ripemd160_es} from './es/ripemd160';
// import {ripemd160_wasm} from './wasm/ripemd160';

/**
 * Synchronous SHA-256, using any available method (WASM if available, ES otherwise)
 * @param atu8_data - input data
 * @returns output digest
 */
export const ripemd160_sync_any = (atu8_data: Uint8Array): Uint8Array =>
	// // attempt sync WASM
	// try_sync(() => ripemd160_wasm(atu8_data))[0] ??

	// use fallback
	ripemd160_es(atu8_data);

