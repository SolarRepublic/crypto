/* eslint-disable implicit-arrow-linebreak */
import {try_sync} from '@blake.regalia/belt';

import {sha256_sync_es} from './es/sha256';
import {sha256_sync_wasm} from './wasm/sha256';

/**
 * Synchronous SHA-256, using any available method (WASM if available, ES otherwise)
 * @param atu8_data - input data
 * @returns output digest
 */
export const sha256_sync_any = (atu8_data: Uint8Array): Uint8Array<ArrayBuffer> =>
	// attempt sync WASM
	try_sync(() => sha256_sync_wasm(atu8_data))[0]
	// use fallback
	?? sha256_sync_es(atu8_data);
