import { describe, it, expect } from 'vitest';

import { resolveSiteUrl } from '../site-url.js';

describe('resolveSiteUrl', () => {
	it('keeps an absolute http(s) url exactly as authored', () => {
		expect(resolveSiteUrl('https://www.example.com')).toBe('https://www.example.com');
		expect(resolveSiteUrl('http://localhost:8080/')).toBe('http://localhost:8080/');
	});

	// The reported crash: a site set `url: '/'` and the URL builders threw
	// mid-render rather than treating it as absent.
	it('drops anything that is not an absolute http(s) url', () => {
		for (const value of ['/', '', 'www.example.com', 'ftp://example.com', 'not a url']) {
			expect(resolveSiteUrl(value)).toBeUndefined();
		}
	});

	it('drops a non-string without throwing', () => {
		for (const value of [undefined, null, 0, {}, []]) {
			expect(resolveSiteUrl(value)).toBeUndefined();
		}
	});
});
