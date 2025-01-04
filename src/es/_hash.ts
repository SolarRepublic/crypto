import {bytes, dataview, dataview_from} from '@blake.regalia/belt';

/**
 * Updates a cryptographic hash state
 * @param atu8_buffer 
 * @param f_compute 
 * @param atu8_data 
 * @param nb_block 
 * @param ib_write 
 * @param nb_data 
 * @param dv_data 
 * @returns 
 */
export const hash_update = (
	atu8_buffer: Uint8Array,
	f_compute: (_dv_data?: DataView, ib_offset?: number) => void,
	atu8_data: Uint8Array,
	nb_block=64,
	ib_write=0,
	nb_data: number=atu8_data.length,
	dv_data: DataView=dataview_from(atu8_data)
): number => {
	// each byte of input data
	for(let ib_read=0; ib_read<nb_data;) {
		// calculate size of the chunk
		const nb_chunk = Math.min(nb_block - ib_write, nb_data - ib_read);

		// can fit a full 64-byte chunk from data directly
		if(nb_block === nb_chunk) {
			// compute hashes while full 64-byte blocks remain
			for(; ib_read+nb_block<=nb_data; ib_read+=nb_block) f_compute(dv_data, ib_read);

			// move on to last message block
			continue;
		}

		// copy partial data to the buffer
		atu8_buffer.set(atu8_data.subarray(ib_read, ib_read+nb_chunk), ib_write);

		// advance the read/write pointers
		ib_read += nb_chunk;
		ib_write += nb_chunk;

		// buffer is full
		if(nb_block === ib_write) {
			// process the buffer
			f_compute();

			// reset write pointer
			ib_write = 0;
		}
	}

	// return new write pointer
	return ib_write;
};

/**
 * Finalizes a cryptographic hash into a digest
 * @param ib_write 
 * @param nb_data 
 * @param atu8_buffer 
 * @param f_compute 
 * @param f_construct 
 * @param nb_digest 
 * @param b_le 
 * @returns 
 */
export const hash_finalize = (
	ib_write: number,
	nb_data: number,
	atu8_buffer: Uint8Array,
	f_compute: (_dv_data?: DataView, ib_offset?: number) => void,
	f_construct: (dv_digest: DataView) => void,
	nb_digest=32,
	b_le=false
): Uint8Array => {
	// 5.1.1: "Append the bit '1' to the end of the message, followed by 𝑘 zero bits"
	// demarcate with high bit
	atu8_buffer[ib_write++] = 0x80;
	atu8_buffer.fill(0, ib_write);

	// 5.1.1: "𝑙+1+𝑘≡448 mod 512"; cannot fit length in current block; recompute and pad
	if(ib_write > 56) (f_compute(), ib_write=0);  // eslint-disable-line @typescript-eslint/no-unused-expressions

	// 5.1.1: right-pad with zeroes
	atu8_buffer.fill(0, ib_write);

	// 5.1.1: "Then append the 64-bit block that is equal to the number 𝑙 expressed using a binary representation"
	dataview_from(atu8_buffer).setBigUint64(56, BigInt(nb_data * 8), b_le);

	// final round
	f_compute();

	// prep digest output buffer
	const atu8_digest = bytes(nb_digest);

	// construct digest from state
	f_construct(dataview_from(atu8_digest));

	// return digest output
	return atu8_digest;
};
