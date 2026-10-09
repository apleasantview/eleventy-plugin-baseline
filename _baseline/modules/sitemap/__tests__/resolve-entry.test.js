import { describe, expect, it } from 'vitest';
import { resolveSitemapEntry } from '../utils/resolve-entry.js';

const PAGE_DATE = new Date('2026-03-04T00:00:00.000Z');

function data(extra = {}) {
	return { page: { date: PAGE_DATE }, ...extra };
}

describe('resolveSitemapEntry', () => {
	it('resolves to an included entry with nothing authored', () => {
		expect(resolveSitemapEntry(data())).toEqual({
			ignore: false,
			changefreq: undefined,
			priority: undefined,
			lastmod: PAGE_DATE
		});
	});

	it('carries the author keys through', () => {
		const lastmod = new Date('2026-01-15T00:00:00.000Z');
		const entry = resolveSitemapEntry(data({ sitemap: { changefreq: 'weekly', priority: 0.7, lastmod } }));

		expect(entry).toEqual({ ignore: false, changefreq: 'weekly', priority: 0.7, lastmod });
	});

	// `priority: 0` is a legal value and the lowest one. The dead registration
	// this replaced used -1 as its unset sentinel, which made 0 unreachable.
	it('keeps a priority of zero', () => {
		expect(resolveSitemapEntry(data({ sitemap: { priority: 0 } })).priority).toBe(0);
	});

	it('treats an empty changefreq as unset', () => {
		expect(resolveSitemapEntry(data({ sitemap: { changefreq: '' } })).changefreq).toBeUndefined();
	});

	it('ignores a page carrying sitemap.ignore', () => {
		expect(resolveSitemapEntry(data({ sitemap: { ignore: true } })).ignore).toBe(true);
	});

	it('ignores a page carrying bare noindex', () => {
		expect(resolveSitemapEntry(data({ noindex: true })).ignore).toBe(true);
	});

	it('ignores a page carrying seo.noindex', () => {
		expect(resolveSitemapEntry(data({ seo: { noindex: true } })).ignore).toBe(true);
	});

	// The reason `seo.noindex` is a fallback rather than a second condition: a
	// page has to be able to opt back into a sitemap its directory excluded.
	it('lets seo.noindex false overrule an inherited noindex', () => {
		expect(resolveSitemapEntry(data({ noindex: true, seo: { noindex: false } })).ignore).toBe(false);
	});

	it('does not read a noindex that is neither of the two keys', () => {
		expect(resolveSitemapEntry(data({ settings: { noindex: true } })).ignore).toBe(false);
	});

	it('survives a cascade with no page and no author key', () => {
		expect(resolveSitemapEntry(undefined)).toEqual({
			ignore: false,
			changefreq: undefined,
			priority: undefined,
			lastmod: undefined
		});
	});
});
