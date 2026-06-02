import { describe, it, expect } from 'vitest';
import { resolveSubdir } from '../resolve-subdir.js';

describe('resolveSubdir', () => {
	it('returns input and output paths with trailing slashes for typical inputs', () => {
		const result = resolveSubdir('./src/', './dist/', 'assets');
		expect(result).toEqual({
			input: './src/assets/',
			output: './dist/assets/'
		});
	});

	it('falls back to input/output alone when rawDir is falsy', () => {
		const result = resolveSubdir('./src/', './dist/', '');
		expect(result).toEqual({
			input: './src/',
			output: './dist/'
		});
	});

	it('normalises a messy rawDir to the same output as the clean case', () => {
		const clean = resolveSubdir('./src/', './dist/', 'assets');
		const messy = resolveSubdir('./src/', './dist/', './assets/');
		expect(messy).toEqual(clean);
	});
});
