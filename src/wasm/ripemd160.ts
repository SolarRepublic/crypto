import type {IHasher} from 'hash-wasm/dist/lib/WASMInterface';

import {die, timeout_exec} from '@blake.regalia/belt';

let y_ripemd160: IHasher;

export const ripemd160_wasm_load = async(xt_wait=Infinity): Promise<IHasher> => y_ripemd160
	?? await timeout_exec(xt_wait, async() => (await import('hash-wasm/dist/lib/ripemd160')).createRIPEMD160())
		.then(([y_hasher]) => y_ripemd160 = y_hasher!)
	?? die('Failed to load RIPEMD-160 WASM module');

	// 	.createRIPEMD160().then(
	// 		(y_instance) => y_ripemd160 = y_instance,
	// 		(e_load) => console.error(`Failed to load RIPEMD-160 WASM module:\n`+(e_load as Error).message))
	// )[0] ?? die();

// export const ripemd160_wasm_loads = async(xt_wait: number): Promise<boolean> => !!(await timeout_exec(xt_wait, ripemd160_wasm_ready))[0];

export const ripemd160_wasm = (atu8_data: Uint8Array): Uint8Array => y_ripemd160?.init().update(atu8_data).digest('binary')
	?? die('RIPEMD-160 WASM module not ready or failed to load');
