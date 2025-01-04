import { bytes, bytes_to_base64, bytes_to_base93, bytes_to_hex, hex_to_bytes, text_to_bytes } from '@blake.regalia/belt';
import {ripemd160_es} from '../src/es/ripemd160';

const a_vectors = [
	// {
	// 	in: '',
	// 	out: '9c1185a5c5e9fc54612808977ee8f548b2258d31',
	// },
	// {
	// 	in: 'a',
	// 	out: '0bdc9d2d256b3ee9daae347be6f4dc835a467ffe',
	// },
	// {
	// 	in: 'abc',
	// 	out: '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc',
	// },
	// {
	// 	in: 'message digest',
	// 	out: '5d0689ef49d2fae572b881b123a85ffa21595f36',
	// },
	// {
	// 	in: 'abcdefghijklmnopqrstuvwxyz',
	// 	out: 'f71c27109c692c1b56bbdceb5b9d2865b3708dbc',
	// },
	{
		in: 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
		out: '12a053384a9c0c88e405a06c27dcf49ada62eb2b',
	},
	// {
	// 	in: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
	// 	out: 'b0e20b6e3116640286ed3a87a5713079b21f5189',
	// },
	// {
	// 	in: '1234567890'.repeat(8),
	// 	out: '9b752e45573d4b39f4dbd3323cab82bf63326bfb',
	// },
];

const xt_start = performance.now();
for(let i_trial=0; i_trial<1024; i_trial++) {
	for(const g_vector of a_vectors) {
		const atu8_actual = ripemd160_es(text_to_bytes(g_vector.in));
		const sb16_actual = bytes_to_hex(atu8_actual);

		if(sb16_actual !== g_vector.out.replace(/\s+/g, '')) {
			debugger;
			throw Error(`Failed RIPEMD-160 vector on '${g_vector.in}';\n expected:${g_vector.out}\nactual:${sb16_actual}`);
		}
	}
}
const xt_elapsed = performance.now() - xt_start;
console.log(`Elapsed: ${xt_elapsed}`);

debugger;


const a_shifts = [
	[11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
	[12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
	[13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
	[14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
	[15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
];

console.log(bytes_to_base93(bytes(a_shifts.flat())));


bytes_to_base64;
bytes_to_base93;

console.log('pass');
