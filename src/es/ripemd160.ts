import {array_fill, base93_to_bytes, bytes, dataview, dataview_from} from '@blake.regalia/belt';

import {hash_finalize, hash_update} from './_hash';
import {rotl_32} from './nist';

const NB_BLOCK = 64;

const ATU8_RHO = base93_to_bytes("ILNX@G&@wADA>NUs4HQA");  // eslint-disable-line @stylistic/quotes
/* To reproduce the above base93-encoded string:
```js
	import {bytes_to_base93} from '@blake.regalia/belt';
	const ATU8_RHO = new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]);

	console.log(bytes_to_base93(new Uint8Array(ATU32_RHO.buffer)));
```
*/

const ATU8_SHIFTS = base93_to_bytes("9mj|(B#JnhtE'Uf;JD0Q3hQF<Y<&ZI@8auELj;0 gTz;mCEL6&tE{Ga&JDUP2&+C^Gb;V gTlL+C#U131 _Gm&] 1Q0{Ht]GA");
/* To reproduce the above base93-encoded string:
```js
	import {bytes_to_base93} from '@blake.regalia/belt';
	const A_SHIFTS = [
		[11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
		[12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
		[13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
		[14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
		[15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
	];

	console.log(bytes_to_base93(bytes(A_SHIFTS.flat())));
```
*/

// 0..16
const A_INDEXES_L = [bytes(16).map((xb, i) => i)];

// p(i)
const A_INDEXES_R = [A_INDEXES_L[0].map(i => ((9 * i) + 5) % 16)];

// create shifts arrays
const [A_SHIFTS_L, A_SHIFTS_R] = [
	A_INDEXES_L,
	A_INDEXES_R,
].map(a_indexes => (
	// eslint-disable-next-line no-sequences
	array_fill(4, (xb, i_index) => a_indexes.push(a_indexes[i_index].map(i => ATU8_RHO[i]))),
	a_indexes.map((atu8, i) => atu8.map(xb => ATU8_SHIFTS[(i*16)+xb]))
));

const ATU8_KL = new Uint32Array([0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e]);
const ATU8_KR = new Uint32Array([0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000]);

const A_GROUP_PARAMS = array_fill(5, (_, i_group) => [
	ATU8_KL, ATU8_KR,
	A_INDEXES_L, A_INDEXES_R,
	A_SHIFTS_L, A_SHIFTS_R,
].map(az => az[i_group]) as [
	number, number,
	Uint8Array, Uint8Array,
	Uint8Array, Uint8Array,
]);


const twid = (i_group: number, xn_x: number, xn_y: number, xn_z: number): number => !i_group
	? xn_x ^ xn_y ^ xn_z
	: 1 === i_group
		? (xn_x & xn_y) | (~xn_x & xn_z)
		: 2 === i_group
			? (xn_x | ~xn_y) ^ xn_z
			: 3 === i_group
				? (xn_x & xn_z) | (xn_y & ~xn_z)
				: xn_x ^ (xn_y | ~xn_z);

/* eslint-disable @typescript-eslint/naming-convention,  prefer-const */
export const ripemd160_es = (_atu8_data: Uint8Array): Uint8Array => {
	// prep working buffer
	let _atu8_buffer = bytes(NB_BLOCK);
	let _dv_block = dataview_from(_atu8_buffer);

	// let _a_state = [
	// 	0x67452301 | 0,
	// 	0xefcdab89 | 0,
	// 	0x98badcfe | 0,
	// 	0x10325476 | 0,
	// 	0xc3d2e1f0 | 0,
	// ];

	let _xn_h0 = 0x67452301 | 0;
	let _xn_h1 = 0xefcdab89 | 0;
	let _xn_h2 = 0x98badcfe | 0;
	let _xn_h3 = 0x10325476 | 0;
	let _xn_h4 = 0xc3d2e1f0 | 0;

	const _a_words: number[] = [];
	/* eslint-enable @typescript-eslint/naming-convention */

	const f_compute = (dv_read: DataView=_dv_block, ib_offset=0) => {
		for(let iw32_write=0; iw32_write<16; iw32_write++)
			_a_words[iw32_write] = dv_read.getUint32(ib_offset + (iw32_write * 4), true);  // eslint-disable-line curly, nonblock-statement-body-position

		// let [xn_al, xn_bl, xn_cl, xn_dl, xn_el] = _a_state;
		// let [xn_ar, xn_br, xn_cr, xn_dr, xn_er] = _a_state;

		/* eslint-disable one-var */
		let xn_al = _xn_h0, xn_ar = xn_al;
		let xn_bl = _xn_h1, xn_br = xn_bl;
		let xn_cl = _xn_h2, xn_cr = xn_cl;
		let xn_dl = _xn_h3, xn_dr = xn_dl;
		let xn_el = _xn_h4, xn_er = xn_el;
		/* eslint-enable one-var */

		// each group 0..5
		for(let i_group=0; i_group<5; i_group++) {
			// detuple group parameters
			const [
				xn_hbl, xn_hbr,
				atu8_rl, atu8_rr,
				atu8_sl, atu8_sr,
			] = A_GROUP_PARAMS[i_group];

			// each round 0..16
			for(let i_round=0; i_round<16; i_round++) {
				let xn_tl = rotl_32(xn_al + twid(i_group, xn_bl, xn_cl, xn_dl) + _a_words[atu8_rl[i_round]] + xn_hbl, atu8_sl[i_round]) + xn_el;
				xn_al = xn_el;
				xn_el = xn_dl;
				xn_dl = rotl_32(xn_cl, 10);
				xn_cl = xn_bl;
				xn_bl = xn_tl | 0;

				let xn_tr = rotl_32(xn_ar + twid(4-i_group, xn_br, xn_cr, xn_dr) + _a_words[atu8_rr[i_round]] + xn_hbr, atu8_sr[i_round]) + xn_er;
				xn_ar = xn_er;
				xn_er = xn_dr;
				xn_dr = rotl_32(xn_cr, 10);
				xn_cr = xn_br;
				xn_br = xn_tr | 0;
			}
		}

		// _a_state = [
		// 	(_a_state[1] + xn_cl + xn_dr) | 0,
		// 	(_a_state[2] + xn_dl + xn_er) | 0,
		// 	(_a_state[3] + xn_el + xn_ar) | 0,
		// 	(_a_state[4] + xn_al + xn_br) | 0,
		// 	(_a_state[0] + xn_bl + xn_cr) | 0,
		// ];

		let xn_h0_tmp = _xn_h0;
		_xn_h0 = (_xn_h1 + xn_cl + xn_dr) | 0;
		_xn_h1 = (_xn_h2 + xn_dl + xn_er) | 0;
		_xn_h2 = (_xn_h3 + xn_el + xn_ar) | 0;
		_xn_h3 = (_xn_h4 + xn_al + xn_br) | 0;
		_xn_h4 = (xn_h0_tmp + xn_bl + xn_cr) | 0;
	};

	// update state with input data
	let ib_write = hash_update(_atu8_buffer, f_compute, _atu8_data);

	// finalize
	return hash_finalize(ib_write, _atu8_data.length, _atu8_buffer, f_compute, (dv_digest) => {
		// concatenate words to create digest
		[_xn_h0, _xn_h1, _xn_h2, _xn_h3, _xn_h4].map((xw, iw) => dv_digest.setUint32(iw * 4, xw, true));

		// clear registers
		_xn_h0 = _xn_h1 = _xn_h2 = _xn_h3 = _xn_h4 = 0;

		// wipe working buffer
		_atu8_buffer.fill(0);
	}, 20, true);
};
