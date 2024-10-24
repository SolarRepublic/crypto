import {try_sync} from '@blake.regalia/belt';

import {ripemd160_es} from './es/ripemd160';
import {ripemd160_wasm} from './wasm/ripemd160';

export const ripemd160_any_sync = (atu8_data: Uint8Array): Uint8Array => {
	// attempt sync WASM
	const [atu8_digest] = try_sync(() => ripemd160_wasm(atu8_data));

	// use fallback
	return atu8_digest ?? ripemd160_es(atu8_data);
};

