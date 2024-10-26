/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-sequences */
import type {IHasher} from 'hash-wasm/dist/lib/WASMInterface';

import {die, timeout_exec, MutexPool, base93_to_bytes, type NaiveBase93, bytes} from '@blake.regalia/belt';

export type ReferenceObject<w_wrapped> = {
	r?: w_wrapped | undefined;
};

export type HasherReferenceObject = ReferenceObject<IHasher>;

export const hasher_loader = (
	g_ref: HasherReferenceObject,
	s_package: string,
	s_export=s_package.toUpperCase()
) => [
	async(xt_wait=Infinity): Promise<IHasher> => g_ref.r
		?? await timeout_exec(xt_wait, async() => (await import('../../node_modules/hash-wasm/dist/'+s_package+'.umd.min.js'))['create'+s_export]())
			.then(([y_hasher]) => g_ref.r = y_hasher!)
		?? die(`Failed to load ${s_export} WASM module`),
	(atu8_data: Uint8Array) => g_ref.r?.init().update(atu8_data).digest('binary')
		?? die(s_export+' WASM module not ready or failed to load'),
] as const;


export type Hasher = {
	i(_?: never): Hasher;
	u(atu8_data: Uint8Array): Hasher;
	d(nb_padding?: number | undefined): Uint8Array;
};

type HasherExports = WebAssembly.Exports & {
	memory: WebAssembly.Memory;
	Hash_GetBuffer(): number;
	Hash_Init(ni_bits?: number | undefined): void;
	Hash_Update(nb_chunk: number): void;
	Hash_Final(nb_padding?: number | undefined): void;
};

const NB_MAX_HEAP = 16 * 1024;  // 16 KiB

const km_wasm = MutexPool(1);

export const instantiate_wasm = async(
	sb93_binary: NaiveBase93,
	nb_digest: number,
	ni_bits?: number | undefined
): Promise<Hasher> => {
	// WebAssembly not available
	if('undefined' === typeof WebAssembly) die('WebAssembly not supported');

	// compile the binary
	let d_module = await km_wasm.use(() => WebAssembly.compile(base93_to_bytes(sb93_binary)));

	// instantiate the module
	let d_wasm = await WebAssembly.instantiate(d_module);

	// ref its export
	let g_exports = d_wasm.exports as HasherExports;

	// get heap offset
	let xb_offset = g_exports.Hash_GetBuffer();

	// ref heap buffer
	let ab_buffer = g_exports.memory.buffer;

	// create heap view
	let atu8_heap = bytes(ab_buffer, xb_offset, NB_MAX_HEAP);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let f_init = (_?: never) => (g_exports.Hash_Init(ni_bits), k_self);

	/* eslint-disable no-sequences */
	let k_self: Hasher = {
		// init
		i: f_init,

		// update
		u(atu8_data) {
			// read chunks out of data
			for(let xb_read=0, nb_chunk, atu8_chunk; xb_read<atu8_data.length;) {
				// read chunk from memory
				atu8_chunk = atu8_data.subarray(xb_read, xb_read + NB_MAX_HEAP);

				// advance read pointer by how large the chunk was
				xb_read += nb_chunk=atu8_chunk.length;

				// copy into WASM heap
				atu8_heap.set(atu8_chunk);

				// process next chunk
				g_exports.Hash_Update(nb_chunk);
			}

			// chain
			return k_self;
		},

		// digest
		d: nb_padding => (
			g_exports.Hash_Final(nb_padding),
			atu8_heap.slice(0, nb_digest)
		),
	};
	/* eslint-enable */

	return k_self;
};
