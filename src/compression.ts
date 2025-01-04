/// <reference types="bun-types" />
import {bytes, die} from '@blake.regalia/belt';

export const bytes_to_stream = (atu8: Uint8Array): ReadableStream<Uint8Array> => new Response(atu8).body!;
export const pipe_bytes_through = (atu8: Uint8Array, d_pair: ReadableWritablePair<Uint8Array, Uint8Array>): ReadableStream<Uint8Array> => bytes_to_stream(atu8).pipeThrough(d_pair);
export const stream_to_bytes = async(d_stream: ReadableStream): Promise<Uint8Array> => bytes(await new Response(d_stream).arrayBuffer());

const transcompress_bytes_gzip = (atu8: Uint8Array, d_stream: typeof CompressionStream | typeof DecompressionStream) => stream_to_bytes(pipe_bytes_through(atu8, new d_stream('gzip')));

export const [gzip_bytes, gunzip_bytes] = typeof CompressionStream > 't'
	? typeof Bun > 't'
		? die('gzip (de)compression not available in current environment')
		: [
			Bun.gzipSync,
			Bun.gunzipSync,
		]
	: [
		(atu8: Uint8Array): Promise<Uint8Array> => transcompress_bytes_gzip(atu8, CompressionStream),
		(atu8: Uint8Array): Promise<Uint8Array> => transcompress_bytes_gzip(atu8, DecompressionStream),
	];
