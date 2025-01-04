
import {base93_to_bytes, bytes, dataview_from} from '@blake.regalia/belt';

import {hash_finalize, hash_update} from './_hash.js';
import {ch_32, maj_32, rotr_32} from './nist.js';


// 4.2.2: SHA-256 Constants "These words represent the first 32 bits of the fractional parts of the cube roots of the first 64 prime numbers"
const ATU32_SHA256_K = /* @__PURE__ */ new Uint32Array(base93_to_bytes("_q_3?LBow#d@g#B5P8P_9tmzy^x']v{sVym!wT'vk-GhKhSt,@wh]Y+/RuC,H*snxxOTRbT&/aG(&R!&q/%#Ux!_Y<c}l&;b5x:wV>BcmLWza2keak[Q`o#vhFn/+J`c*2MAl<IjYpKErJJO95Ix20!E@Z6~-tn#mDoL;m&r1eQSXCZ5eS<t)?sW)oZZ,m?~Cy5iA,MPBNfkVH~vdGKky.;1_nRY8'80GQ8w>=nCQJRPQamEg.Y<M58L)4_${4mPcTa4bdoUoZ{1a1!1$+MQ$Yd%e7vpa&WR>F2mUYF{TIF?TtS>)Yp@*pI(xI").buffer);
/* To reproduce the above base93-encoded string:
```js
	import {bytes_to_base93} from '@blake.regalia/belt';
	const ATU32_SHA256_K = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	console.log(bytes_to_base93(new Uint8Array(ATU32_SHA256_K.buffer)));
```
*/

// 5.3.3: SHA-256 "For SHA-256, the initial hash value, 𝐻^(0), shall consist of the following eight 32-bit words [...]"
const ATU32_SHA256_IV = /* @__PURE__ */ new Uint32Array(base93_to_bytes("6R[s/~NVP8p=p(F2|VR]jc{uGM'D{f-]#VK,&@t").buffer);
/* To reproduce the above base93-encoded string:
```js
	import {bytes_to_base93} from '@blake.regalia/belt';
	const ATU32_SHA256_IV = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	console.log(bytes_to_base93(new Uint8Array(ATU32_SHA256_IV.buffer)));
```
*/

// 6.2: "The algorithm uses a message schedule of sixty-four 32-bit words"
const ATU32_SHA256_W = /* @__PURE__ */ new Uint32Array(64);

/**
 * Synchronous SHA-256 implemented in ES, suitable for operating on less sensitive data
 * @param _atu8_data 
 * @returns 
 */
/* eslint-disable @typescript-eslint/naming-convention */
export const sha256_sync_es = (
	_atu8_data: Uint8Array
): Uint8Array => {
	// prep working buffer
	const _atu8_buffer = bytes(64);
	const _dv_buffer = dataview_from(_atu8_buffer);

	// 6.2.1: The eight working variables are labeled a, b, c, d, e, f, g, and h.
	// 6.2.1: 1. Set the initial hash value, 𝐻^(0), as specified in Sec. 5.3.3.
	let _xn_a0 = ATU32_SHA256_IV[0] | 0;
	let _xn_b0 = ATU32_SHA256_IV[1] | 0;
	let _xn_c0 = ATU32_SHA256_IV[2] | 0;
	let _xn_d0 = ATU32_SHA256_IV[3] | 0;
	let _xn_e0 = ATU32_SHA256_IV[4] | 0;
	let _xn_f0 = ATU32_SHA256_IV[5] | 0;
	let _xn_g0 = ATU32_SHA256_IV[6] | 0;
	let _xn_h0 = ATU32_SHA256_IV[7] | 0;
	/* eslint-enable @typescript-eslint/naming-convention */

	// 6.2.2: SHA-256 Hash Computation
	const f_compute = (dv_data=_dv_buffer, ib_offset=0): void => {
		// prep write pointer
		let iw32_write = 0;

		// 6.2.2: 1. "Prepare the message schedule, {𝑊_𝑡}={... ⟺ 0≤𝑡≤15}"
		for(; iw32_write<16; iw32_write++, ib_offset+=4)
			// 𝑊_𝑡 = 𝑀₁^(𝑖)
			ATU32_SHA256_W[iw32_write] = dv_data.getUint32(ib_offset);  // eslint-disable-line curly, nonblock-statement-body-position

		// 6.2.2: 1. "Prepare the message schedule, {𝑊_𝑡}={... ⟺ 16≤𝑡≤63}"
		for(; iw32_write<64; iw32_write++) {
			// cache 𝑊_(𝑡−15)
			const xn_w15 = ATU32_SHA256_W[iw32_write-15];

			// compute 𝜎₀^{256}
			const xn_s0 = rotr_32(xn_w15, 7) ^ rotr_32(xn_w15, 18) ^ (xn_w15 >>> 3);

			// cache 𝑊_(𝑡−2)
			const xn_w2 = ATU32_SHA256_W[iw32_write-2];

			// compute 𝜎₁^{256}
			const xn_s1 = rotr_32(xn_w2, 17) ^ rotr_32(xn_w2, 19) ^ (xn_w2 >>> 10);

			// 𝑊_𝑡 = 𝜎₁^{256} (𝑊_(𝑡−2))+𝑊_(𝑡−7)+𝜎₀^{256} (𝑊_(𝑡−15))+𝑊_(𝑡−16) ⟺ 16≤𝑡≤63
			ATU32_SHA256_W[iw32_write] = (xn_s1 + ATU32_SHA256_W[iw32_write-7] + xn_s0 + ATU32_SHA256_W[iw32_write-16]) | 0;
		}

		// 6.2.2: 2. "Initialize the eight working variables, a, b, c, d, e, f, g, and h, with the (𝑖-1)ˢᵗ hash value:"
		let xn_a = _xn_a0;
		let xn_b = _xn_b0;
		let xn_c = _xn_c0;
		let xn_d = _xn_d0;
		let xn_e = _xn_e0;
		let xn_f = _xn_f0;
		let xn_g = _xn_g0;
		let xn_h = _xn_h0;

		// 6.2.2: 3. "For t=0 to 63:"
		for(let iw32_read=0; iw32_read<64; iw32_read++) {
			// 𝑇₁=ℎ+∑_1^256 (𝑒) + 𝐶ℎ(𝑒,𝑓,𝑔) + 𝐾_𝑡^256 + 𝑊_𝑡
			const xn_t1 = (xn_h + (rotr_32(xn_e, 6) ^ rotr_32(xn_e, 11) ^ rotr_32(xn_e, 25)) + ch_32(xn_e, xn_f, xn_g) + ATU32_SHA256_K[iw32_read] + ATU32_SHA256_W[iw32_read]) | 0;

			// 𝑇₂=∑_0^256 (𝑎) + 𝑀𝑎𝑗(𝑎,𝑏,𝑐)
			const xn_t2 = ((rotr_32(xn_a, 2) ^ rotr_32(xn_a, 13) ^ rotr_32(xn_a, 22)) + maj_32(xn_a, xn_b, xn_c)) | 0;

			// h=g; g=f; f=e; e=d+𝑇₁; d=c; c=b; b=a; a=𝑇₁+𝑇₂
			xn_h = xn_g;
			xn_g = xn_f;
			xn_f = xn_e;
			xn_e = (xn_d + xn_t1) | 0;
			xn_d = xn_c;
			xn_c = xn_b;
			xn_b = xn_a;
			xn_a = (xn_t1 + xn_t2) | 0;
		}

		// 6.2.2: 4. "Compute the 𝑖ᵗʰ intermediate hash value 𝐻^(𝑖): [...]"
		_xn_a0 = (xn_a + _xn_a0) | 0;
		_xn_b0 = (xn_b + _xn_b0) | 0;
		_xn_c0 = (xn_c + _xn_c0) | 0;
		_xn_d0 = (xn_d + _xn_d0) | 0;
		_xn_e0 = (xn_e + _xn_e0) | 0;
		_xn_f0 = (xn_f + _xn_f0) | 0;
		_xn_g0 = (xn_g + _xn_g0) | 0;
		_xn_h0 = (xn_h + _xn_h0) | 0;
	};

	// update state with input data
	const ib_write = hash_update(_atu8_buffer, f_compute, _atu8_data);

	// finalize
	return hash_finalize(ib_write, _atu8_data.length, _atu8_buffer, f_compute, (dv_digest) => {
		// concatenate words to create digest
		[_xn_a0, _xn_b0, _xn_c0, _xn_d0, _xn_e0, _xn_f0, _xn_g0, _xn_h0].map((xw, iw) => dv_digest.setUint32(iw * 4, xw));

		// clear registers
		_xn_a0 = _xn_b0 = _xn_c0 = _xn_d0 = _xn_e0 = _xn_f0 = _xn_g0 = _xn_h0 = 0;

		// wipe working buffer
		_atu8_buffer.fill(0);

		// wipe message schedule space
		ATU32_SHA256_W.fill(0);
	});
};
