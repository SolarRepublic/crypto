/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-sequences */
import type {NaiveBase93} from '@blake.regalia/belt';

import {die, timeout_exec, MutexPool, base93_to_bytes, bytes, gunzip_bytes} from '@blake.regalia/belt';

export type ReferenceObject<w_wrapped> = {
	r?: w_wrapped | undefined;
};

export type Hasher = {
	i(_?: never): Hasher;
	u(atu8_data: Uint8Array): Hasher;
	d(nb_padding?: number): Uint8Array;
};

export type HasherReferenceObject = ReferenceObject<Hasher>;

type HasherExports = WebAssembly.Exports & {
	memory: WebAssembly.Memory;
	Hash_GetBuffer(): number;
	Hash_Init(ni_bits?: number): void;
	Hash_Update(nb_chunk: number): void;
	Hash_Final(nb_padding?: number): void;
};

const NB_MAX_HEAP = 16 * 1024;  // 16 KiB

const km_wasm = MutexPool(1);

const import_resource = async(s_package: string, s_type: string) => base93_to_bytes(
	(await import(`./bytecode/${s_package}${s_type}.ts`)).default as NaiveBase93
);

export const hasher_loader = (
	s_package: string,
	nb_digest: number,
	g_ref: HasherReferenceObject={},
	s_export=s_package.toUpperCase(),
	nb_padding?: number
) => [
	// explicit loader
	async(xt_wait=Infinity): Promise<Hasher> => g_ref.r
		?? await timeout_exec(xt_wait,
			async() => instantiate_wasm(
				await (globalThis.DecompressionStream
					? gunzip_bytes(await import_resource(s_package, '.wasm.gz'))
					: import_resource(s_package, '.wasm')),
				nb_digest
			).then(y => g_ref.r = y)
		).then(([y]) => y)
		?? die(`Failed to load ${s_export} WASM module`),

	// hasher function
	(atu8_data: Uint8Array) => g_ref.r?.i().u(atu8_data).d(nb_padding)
		?? die(s_export+' WASM module not ready or failed to load'),
] as const;

export const instantiate_wasm = async(
	atu8_binary: Uint8Array,
	nb_digest: number,
	ni_bits?: number
): Promise<Hasher> => {
	// WebAssembly not available
	if('undefined' === typeof WebAssembly) die('WebAssembly not supported');

	// compile the binary
	let d_module = await km_wasm.use(() => WebAssembly.compile(atu8_binary));

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
