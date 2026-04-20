import { describe, it, expect } from 'vitest';
import { addTrailingSlash, resolveSubdir } from '../helpers.js';

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
