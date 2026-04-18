import { describe, it, expect } from 'vitest';
import { addTrailingSlash, resolveAssetsDir } from '../helpers.js';

describe('addTrailingSlash', () => {
	it('adds a trailing slash to a path without one', () => {
		expect(addTrailingSlash('src')).toBe('src/');
	});

	it('leaves a path with a trailing slash untouched', () => {
		expect(addTrailingSlash('src/')).toBe('src/');
	});

	it('returns "/" for an empty string', () => {
		expect(addTrailingSlash('')).toBe('/');
	});
});

describe('resolveAssetsDir', () => {
	it('returns assetsDir and assetsOutputDir with trailing slashes for typical inputs', () => {
		const result = resolveAssetsDir('./src/', './dist/', 'assets');
		expect(result).toEqual({
			assetsDir: './src/assets/',
			assetsOutputDir: './dist/assets/'
		});
	});

	it('falls back to input/output alone when rawDir is falsy', () => {
		const result = resolveAssetsDir('./src/', './dist/', '');
		expect(result).toEqual({
			assetsDir: './src/',
			assetsOutputDir: './dist/'
		});
	});

	it('normalises a messy rawDir to the same output as the clean case', () => {
		const clean = resolveAssetsDir('./src/', './dist/', 'assets');
		const messy = resolveAssetsDir('./src/', './dist/', './assets/');
		expect(messy).toEqual(clean);
	});
});
