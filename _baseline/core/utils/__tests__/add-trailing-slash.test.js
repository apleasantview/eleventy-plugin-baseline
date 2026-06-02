import { describe, it, expect } from 'vitest';
import { addTrailingSlash } from '../add-trailing-slash.js';

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
