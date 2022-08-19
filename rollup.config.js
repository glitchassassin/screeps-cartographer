import typescript from '@rollup/plugin-typescript';
import clear from "rollup-plugin-clear";

export default {
	input: 'src/main.ts',
	plugins: [
		clear({ targets: ["dist"] }),
		typescript({ tsconfig: './tsconfig.json' }) // so Rollup can convert TypeScript to JavaScript
	],
	output: { 
		file: 'dist/main.js', 
		format: 'cjs',
		sourcemap: true
	}
};