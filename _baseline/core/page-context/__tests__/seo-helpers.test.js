import { describe, it, expect } from 'vitest';

import { normalizeCanonical } from '../seo-helpers.js';

describe('normalizeCanonical', () => {
	it('resolves a path against the site url and strips the fragment', () => {
		expect(normalizeCanonical('/about/', 'https://www.example.com')).toBe('https://www.example.com/about/');
		expect(normalizeCanonical('/about/#team', 'https://www.example.com')).toBe('https://www.example.com/about/');
	});

	it('returns undefined when either input is missing', () => {
		expect(normalizeCanonical(undefined, 'https://www.example.com')).toBeUndefined();
		expect(normalizeCanonical('/about/', undefined)).toBeUndefined();
	});

	// Its JSDoc promised undefined for invalid input, but an unresolvable base
	// threw and took the whole build down.
	it('returns undefined for a base it cannot resolve, rather than throwing', () => {
		for (const base of ['/', 'www.example.com', 'not a url']) {
			expect(() => normalizeCanonical('/about/', base)).not.toThrow();
			expect(normalizeCanonical('/about/', base)).toBeUndefined();
		}
	});
});
