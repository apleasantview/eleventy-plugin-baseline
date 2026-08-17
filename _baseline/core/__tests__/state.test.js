import { describe, it, expect } from 'vitest';
import { deriveBaselineState } from '../state.js';

const derive = (settings) => deriveBaselineState(settings, {}, {}).settings;

describe('deriveBaselineState — settings.url', () => {
	it('keeps an absolute http(s) URL', () => {
		expect(derive({ url: 'https://www.example.com/' }).url).toBe('https://www.example.com/');
		expect(derive({ url: 'http://localhost:8080/' }).url).toBe('http://localhost:8080/');
	});

	// Returned as authored: the docs ask for an origin with no trailing slash,
	// so the screen rejects, it does not rewrite.
	it('leaves a valid url exactly as authored', () => {
		expect(derive({ url: 'https://www.example.com' }).url).toBe('https://www.example.com');
	});

	// A relative value is truthy, so every downstream `!settings.url` guard passes
	// and the schema graph ships relative @ids. Dropping it here is the fix.
	it('drops a relative URL so it behaves like an absent one', () => {
		expect(derive({ url: '/' }).url).toBeUndefined();
		expect(derive({ url: '/subpath/' }).url).toBeUndefined();
		expect(derive({ url: '' }).url).toBeUndefined();
	});

	it('drops a value that parses but is not http(s)', () => {
		expect(derive({ url: 'localhost:8080' }).url).toBeUndefined();
		expect(derive({ url: 'ftp://www.example.com/' }).url).toBeUndefined();
	});

	it('drops a non-string, and leaves an absent url absent', () => {
		expect(derive({ url: 42 }).url).toBeUndefined();
		expect(derive({}).url).toBeUndefined();
	});
});
