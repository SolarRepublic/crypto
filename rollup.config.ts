import typescript from '@rollup/plugin-typescript';
import {defineConfig} from 'rollup';

import {base93Encoder} from './plugins/base93';

export default defineConfig({
	input: 'src/main.ts',
	output: {
		dir: 'dist',
		format: 'esm',
	},
	plugins: [
		base93Encoder(),
		typescript(),
	],
});
