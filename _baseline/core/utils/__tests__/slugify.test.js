import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify.js';

describe('slugify', () => {
	it('lowercases and hyphenates', () => {
		expect(slugify('About Us')).toBe('about-us');
	});

	it('strips diacritics', () => {
		expect(slugify('Café')).toBe('cafe');
	});

	it('collapses runs of non-alphanumerics into a single hyphen', () => {
		expect(slugify('hello---world!!')).toBe('hello-world');
	});

	it('trims leading and trailing hyphens', () => {
		expect(slugify('---about---')).toBe('about');
	});

	it('returns undefined for null, undefined, or empty input', () => {
		expect(slugify(null)).toBeUndefined();
		expect(slugify(undefined)).toBeUndefined();
		expect(slugify('')).toBeUndefined();
		expect(slugify('!!!')).toBeUndefined();
	});
});
