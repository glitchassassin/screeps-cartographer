import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import clear from 'rollup-plugin-clear';

export default [
	{
		input: 'src/main.ts',
		plugins: [
			clear({ targets: ['dist'] }),
			resolve({ rootDir: 'src' }),
			commonjs(),
			typescript({ tsconfig: './tsconfig.json' }) // so Rollup can convert TypeScript to JavaScript
		],
		output: {
			file: 'dist/main.js',
			format: 'cjs',
			sourcemap: true
		}
	},
	{
		input: 'src/test.ts',
		plugins: [
			clear({ targets: ['dist'] }),
			resolve({ rootDir: 'src' }),
			commonjs(),
			typescript({ tsconfig: './tsconfig.json' }) // so Rollup can convert TypeScript to JavaScript
		],
		output: {
			file: 'dist/test.js',
			format: 'cjs',
			sourcemap: true
		}
	},
];