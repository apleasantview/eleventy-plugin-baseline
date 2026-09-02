import { describe, expect, it } from 'vitest';
import { dedupeLink, dedupeMeta } from '../utils/dedupe.js';

describe('dedupeMeta', () => {
	it('keeps the last of two tags sharing a name', () => {
		const out = dedupeMeta([
			{ name: 'description', content: 'first' },
			{ name: 'description', content: 'second' }
		]);

		expect(out).toEqual([{ name: 'description', content: 'second' }]);
	});

	it('preserves insertion order across distinct tags', () => {
		const out = dedupeMeta([
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width' },
			{ property: 'og:title', content: 'T' }
		]);

		expect(out.map((m) => m.charset ?? m.name ?? m.property)).toEqual(['utf-8', 'viewport', 'og:title']);
	});

	// The regression. A dark-mode site ships two theme-color tags distinguished
	// only by `media`, and keying on the name alone silently kept one of them.
	it('keeps media-scoped variants of the same name', () => {
		const out = dedupeMeta([
			{ name: 'theme-color', content: '#111', media: '(prefers-color-scheme: dark)' },
			{ name: 'theme-color', content: '#fff', media: '(prefers-color-scheme: light)' }
		]);

		expect(out).toHaveLength(2);
		expect(out.map((m) => m.content)).toEqual(['#111', '#fff']);
	});

	it('still collapses two tags sharing both name and media', () => {
		const out = dedupeMeta([
			{ name: 'theme-color', content: '#111', media: '(prefers-color-scheme: dark)' },
			{ name: 'theme-color', content: '#000', media: '(prefers-color-scheme: dark)' }
		]);

		expect(out).toEqual([{ name: 'theme-color', content: '#000', media: '(prefers-color-scheme: dark)' }]);
	});

	it('treats an unscoped tag as distinct from a scoped one', () => {
		const out = dedupeMeta([
			{ name: 'theme-color', content: '#fff' },
			{ name: 'theme-color', content: '#111', media: '(prefers-color-scheme: dark)' }
		]);

		expect(out).toHaveLength(2);
	});

	it('drops entries with no usable key', () => {
		expect(dedupeMeta([{ content: 'orphan' }])).toEqual([]);
		expect(dedupeMeta()).toEqual([]);
	});
});

describe('dedupeLink', () => {
	it('keeps links that share an href but differ in rel', () => {
		const out = dedupeLink([
			{ rel: 'preconnect', href: 'https://fonts.gstatic.com' },
			{ rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' }
		]);

		expect(out).toHaveLength(2);
	});

	it('keeps alternates that share a rel but differ in hreflang', () => {
		const out = dedupeLink([
			{ rel: 'alternate', hreflang: 'en', href: '/' },
			{ rel: 'alternate', hreflang: 'nl', href: '/nl/' }
		]);

		expect(out).toHaveLength(2);
	});

	it('collapses an exact repeat, last wins', () => {
		const out = dedupeLink([
			{ rel: 'stylesheet', href: '/a.css', id: 'first' },
			{ rel: 'stylesheet', href: '/a.css', id: 'second' }
		]);

		expect(out).toEqual([{ rel: 'stylesheet', href: '/a.css', id: 'second' }]);
	});
});
