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

// The image defaults live here rather than in the shortcode, because this is
// where every other default is applied. `media` rather than `image` as the
// namespace: it is the word already used for the output directory.
describe('deriveBaselineState — media.image', () => {
	const image = (options) => deriveOptions(options).media.image;

	it('applies cheap and safe defaults', () => {
		const defaults = image({});

		// `'auto'` re-encodes the full-size original, the most expensive
		// rendition in the set. It is opt-in.
		expect(defaults.widths).not.toContain('auto');
		// Modern formats first for negotiation, one every client can read last,
		// so the `<img>` fallback is readable by whoever took it.
		expect(defaults.formats).toEqual(['avif', 'webp', 'jpeg']);
		expect(defaults.sizes).toMatch(/max-width/);
	});

	it('lets a project replace any one of them', () => {
		expect(image({ media: { image: { widths: [640, 1280] } } }).widths).toEqual([640, 1280]);
	});

	it('leaves the keys a project did not set alone', () => {
		const resolved = image({ media: { image: { widths: [640] } } });

		expect(resolved.formats).toEqual(['avif', 'webp', 'jpeg']);
		expect(resolved.sizes).toBe(image({}).sizes);
	});

	// `auto` is prepended to Baseline's guess and never to somebody's answer, so
	// whether the value was authored has to travel with it rather than be
	// deduced at the call site.
	it('records whether sizes was authored', () => {
		expect(image({}).sizesAuthored).toBe(false);
		expect(image({ media: { image: { sizes: '50vw' } } }).sizesAuthored).toBe(true);
	});
});
