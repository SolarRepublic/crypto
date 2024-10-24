/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type {Secp256k1} from '@solar-republic/wasm-secp256k1';

import {die, timeout_exec} from '@blake.regalia/belt';

let y_secp256k1: Secp256k1 | undefined;

export const secp256k1_wasm_load = async(xt_wait=Infinity) => y_secp256k1
	?? timeout_exec(xt_wait, async() => (
		await (globalThis.DecompressionStream
			? import('@solar-republic/wasm-secp256k1/gzipped')
			: import('@solar-republic/wasm-secp256k1'))
	).initWasmSecp256k1())
		.then(([y_wrapper]) => y_secp256k1 = y_wrapper)
	?? die('Failed to load Secp256k1 WASM module');

export const secp256k1_wasm = () => y_secp256k1;

