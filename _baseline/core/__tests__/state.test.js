import { describe, it, expect } from 'vitest';
import { deriveBaselineState } from '../state.js';

const derive = (settings) => deriveBaselineState(settings, {}, {}).settings;
const deriveOptions = (options) => deriveBaselineState({}, options, {}).options;

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

// `description` is documented in site-settings and was missing here, so it
// reached page context only on sites that also exposed a `settings` global.
// Where it did not, every page without its own description shipped none.
describe('deriveBaselineState — the identity keys page context reads', () => {
	it('carries title, tagline and description through', () => {
		const settings = derive({
			title: 'My Site',
			tagline: 'A tagline',
			description: 'The site-wide description.'
		});

		expect(settings.title).toBe('My Site');
		expect(settings.tagline).toBe('A tagline');
		expect(settings.description).toBe('The site-wide description.');
	});

	it('leaves an absent description absent rather than inventing one', () => {
		expect(derive({}).description).toBeUndefined();
	});
});

// Saying nothing and saying `false` are different requests. Unset means "the
// default is fine" and still prints the banner, the version line and one module
// summary; an explicit false means "be quiet" and drops all three.
describe('deriveBaselineState — verbosity', () => {
	it('is quiet by default, without being silent', () => {
		expect(deriveOptions({})).toMatchObject({ verbose: false, silent: false });
	});

	it('opts into the narrative on true', () => {
		expect(deriveOptions({ verbose: true })).toMatchObject({ verbose: true, silent: false });
	});

	it('treats an explicit false as a request for silence', () => {
		expect(deriveOptions({ verbose: false })).toMatchObject({ verbose: false, silent: true });
	});
});
