import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import clear from 'rollup-plugin-clear';
import screeps from 'rollup-plugin-screeps';

let cfg;
const dest = process.env.DEST;
const config = process.env.SCREEPS_CONFIG;
if (config) {
	console.log('Loading config from environment variable');
	cfg = JSON.parse(config);
} else if (!dest) {
	console.log('No destination specified - code will be compiled but not uploaded');
} else if ((cfg = require('./screeps.json')[dest]) == null) {
	throw new Error('Invalid upload destination');
}

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
			typescript({ tsconfig: './tsconfig.json' }), // so Rollup can convert TypeScript to JavaScript
			screeps({ config: cfg, dryRun: cfg == null })
		],
		output: {
			file: 'dist_test/main.js',
			format: 'cjs',
			sourcemap: true
		}
	},
];