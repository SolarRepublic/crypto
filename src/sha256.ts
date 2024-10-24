import {try_sync} from '@blake.regalia/belt';

// import {sha256_es} from './es/sha256';
import {sha256_wasm} from './wasm/sha256';

// export const sha256_any_sync = (atu8_data: Uint8Array): Uint8Array => {
// 	// attempt sync WASM
// 	const [atu8_digest] = try_sync(() => sha256_wasm(atu8_data));

// 	// use fallback
// 	return atu8_digest ?? sha256_es(atu8_data);
// };

