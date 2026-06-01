import { describe, expect, it } from 'vitest';
import { resolveCanonicalUrl, createSeoNamespace } from '../build.js';

const siteUrl = 'https://www.example.com';

describe('resolveCanonicalUrl', () => {
	it('builds an absolute URL from page.url and settings.url', () => {
		const url = resolveCanonicalUrl({
			seo: {},
			data: {},
			settings: { url: siteUrl },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/posts/hello/');
	});

	it('strips the query string by default', () => {
		const url = resolveCanonicalUrl({
			seo: { canonical: '/posts/hello/?utm_source=newsletter' },
			data: {},
			settings: { url: siteUrl },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/posts/hello/');
	});

	it('always strips the fragment', () => {
		const url = resolveCanonicalUrl({
			seo: { canonical: '/posts/hello/#intro' },
			data: {},
			settings: { url: siteUrl },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/posts/hello/');
	});

	it('preserves the query when site-level preserveQueryParams is true', () => {
		const url = resolveCanonicalUrl({
			seo: { canonical: '/posts/hello/?ref=docs' },
			data: {},
			settings: { url: siteUrl, seo: { preserveQueryParams: true } },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/posts/hello/?ref=docs');
	});

	it('preserves the query when page-level preserveQueryParams is true', () => {
		const url = resolveCanonicalUrl({
			seo: { canonical: '/posts/hello/?ref=docs' },
			data: { preserveQueryParams: true },
			settings: { url: siteUrl },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/posts/hello/?ref=docs');
	});

	it('lets page-level false override site-level true', () => {
		const url = resolveCanonicalUrl({
			seo: { canonical: '/posts/hello/?ref=docs' },
			data: { preserveQueryParams: false },
			settings: { url: siteUrl, seo: { preserveQueryParams: true } },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/posts/hello/');
	});

	it('returns undefined when the page is noindex', () => {
		const url = resolveCanonicalUrl({
			seo: {},
			data: { noindex: true },
			settings: { url: siteUrl },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBeUndefined();
	});

	it('returns undefined when the site is noindex', () => {
		const url = resolveCanonicalUrl({
			seo: {},
			data: {},
			settings: { url: siteUrl, noindex: true },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBeUndefined();
	});

	it('returns undefined when settings.url is missing', () => {
		const url = resolveCanonicalUrl({
			seo: {},
			data: {},
			settings: {},
			page: { url: '/posts/hello/' }
		});
		expect(url).toBeUndefined();
	});

	it('returns undefined when no canonical source is available', () => {
		const url = resolveCanonicalUrl({
			seo: {},
			data: {},
			settings: { url: siteUrl },
			page: {}
		});
		expect(url).toBeUndefined();
	});

	it('falls back to data.canonical when seo.canonical is missing', () => {
		const url = resolveCanonicalUrl({
			seo: {},
			data: { canonical: '/legacy/path/' },
			settings: { url: siteUrl },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/legacy/path/');
	});

	it('lets seo.canonical override page.url', () => {
		const url = resolveCanonicalUrl({
			seo: { canonical: '/preferred/path/' },
			data: {},
			settings: { url: siteUrl },
			page: { url: '/posts/hello/' }
		});
		expect(url).toBe('https://www.example.com/preferred/path/');
	});
});

describe('createSeoNamespace', () => {
	function makeBuilder(settings = { url: siteUrl }) {
		const scope = { values: new Map(), cache: new WeakMap() };
		return createSeoNamespace({ scope, settings, runtime: {}, options: {} });
	}

	it('writes the resolved canonical URL onto seo.url', () => {
		const build = makeBuilder();
		const out = build({ seo: {}, page: { url: '/posts/hello/' } });
		expect(out.url).toBe('https://www.example.com/posts/hello/');
	});

	it('passes existing seo fields through unchanged', () => {
		const build = makeBuilder();
		const out = build({
			seo: { title: 'Hello', description: 'World', custom: 42 },
			page: { url: '/posts/hello/' }
		});
		expect(out.title).toBe('Hello');
		expect(out.description).toBe('World');
		expect(out.custom).toBe(42);
	});

	it('omits seo.url when the page is noindex', () => {
		const build = makeBuilder();
		const out = build({
			seo: {},
			noindex: true,
			page: { url: '/posts/hello/' }
		});
		expect(out.url).toBeUndefined();
	});
});
